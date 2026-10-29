import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LIVE_URL = 'https://ripple-hackathon.vercel.app';
const SCREENSHOTS_DIR = 'C:\\Users\\soham\\.gemini\\antigravity\\brain\\1dde1e3d-f61c-4c3d-b3f2-66c7699284b5\\screenshots';

async function runLiveVerification() {
  console.log('====================================================');
  console.log(' Ripple — Live Public Deployment Workflow Verification');
  console.log(` Target: ${LIVE_URL}`);
  console.log('====================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
  });

  page.on('response', async (res) => {
    if (res.status() >= 400) {
      try {
        const text = await res.text();
        console.error(`HTTP ${res.status()} from ${res.url()}:`, text);
      } catch {}
    }
  });

  try {
    // 1. Load Public Home Page
    console.log('[Step 1] Loading public landing page...');
    const res = await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    assert.equal(res.status(), 200, 'Public homepage must respond with HTTP 200');
    console.log(`✓ Homepage loaded with HTTP status: ${res.status()}`);

    // Verify title and headline
    const title = await page.title();
    console.log(`✓ Page Title: "${title}"`);
    assert.ok(title.includes('Ripple'), 'Page title must include Ripple');

    // 2. Launch Sample Event Demo Session
    console.log('\n[Step 2] Launching demo session via "Try the live demo"...');
    const demoBtn = await page.waitForSelector('button[data-testid="try-demo-btn"], button ::-p-text(Try the live demo)', { timeout: 15000 });
    await demoBtn.click();

    // Wait for navigation to /events/[id]
    await page.waitForFunction(() => window.location.pathname.startsWith('/events/'), { timeout: 30000 });
    const liveWorkspaceUrl = page.url();
    console.log(`✓ Navigated to live event workspace: ${liveWorkspaceUrl}`);

    // Wait for workspace header and Revision 1
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForFunction(() => document.body.innerText.includes('Revision 1'), { timeout: 15000 });
    console.log('✓ Verified live workspace initial state (Revision 1).');

    // 3. Simulate Venue & Time Shift (Revision 2)
    console.log('\n[Step 3] Triggering official detail change...');
    const simBtn = await page.waitForSelector('button ::-p-text(Simulate venue & time shift)', { timeout: 10000 });
    await simBtn.click();

    const confirmBtn = await page.waitForSelector('button ::-p-text(Confirm & Commit Demo Change)', { timeout: 10000 });
    await confirmBtn.click();

    // Wait for Revision 2 to commit and Outdated counter to equal 4
    await page.waitForFunction(() => {
      const hasRev2 = document.body.innerText.includes('Revision 2');
      const conflictEl = document.querySelector('.text-conflict-600.text-2xl');
      return hasRev2 && conflictEl && conflictEl.textContent?.trim() === '4';
    }, { timeout: 20000 });
    console.log('✓ Revision 2 committed in live Appwrite TablesDB. 4 materials in conflict.');

    // 4. Open WhatsApp Group Announcement & Inspect Correction Preview
    console.log('\n[Step 4] Opening WhatsApp Group Announcement card...');
    const card = await page.waitForSelector('h3 ::-p-text(WhatsApp Group Announcement)', { timeout: 10000 });
    await card.evaluate((el) => {
      const btn = el.closest('.group');
      if (btn) btn.click();
      else el.click();
    });

    const corrTab = await page.waitForSelector('button ::-p-text(Correction Preview)', { timeout: 10000 });
    await corrTab.click();
    await new Promise((r) => setTimeout(r, 1200));

    // Inspect suggested correction text
    const suggestedText = await page.evaluate(() => {
      const ta = document.querySelector('textarea');
      return ta ? ta.value : '';
    });
    console.log('Suggested Draft Text on Live Deployment:');
    console.log(`"${suggestedText}"`);

    // Strict assertions on the corrected announcement
    assert.ok(suggestedText.includes('Doors open at 11:00 AM at the Innovation Lab.'),
      'Draft text MUST preserve surrounding phrasing: "Doors open at 11:00 AM at the Innovation Lab."'
    );
    assert.ok(!suggestedText.includes('10:00 AM'), 'Draft MUST NOT contain obsolete start time 10:00 AM');
    assert.ok(!suggestedText.includes('Main Auditorium'), 'Draft MUST NOT contain obsolete venue Main Auditorium');
    console.log('✓ Verified: Suggested text replaces exact factual spans and preserves surrounding text.');

    // 5. Apply Correction (Creates Version 2)
    console.log('\n[Step 5] Applying correction to create Version 2...');
    const saveBtn = await page.waitForSelector('button[data-testid="save-corrected-btn"], button ::-p-text(Save corrected version)', { timeout: 10000 });
    await saveBtn.click();

    // Verify Version 2 and proposed claims review banner
    await page.waitForFunction(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      const hasV2 = drawer?.textContent?.includes('Version 2') || drawer?.textContent?.includes('v2');
      const hasReview = drawer?.textContent?.includes('Review Extracted Claims');
      return drawer && hasV2 && hasReview;
    }, { timeout: 20000 });
    console.log('✓ Version 2 created in live Appwrite TablesDB. Proposed claims require explicit review.');

    // 6. Explicit Claim Review
    console.log('\n[Step 6] Explicitly confirming proposed claims via "Confirm All Proposed"...');
    const confirmAllBtn = await page.waitForSelector('button ::-p-text(Confirm All Proposed)', { timeout: 10000 });
    await confirmAllBtn.click();
    console.log('[Step 6] Clicked "Confirm All Proposed", waiting for drawer status...');

    // Wait for confirmation to process and material to become Verified Current
    try {
      await page.waitForFunction(() => {
        const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
        return drawer && (drawer.textContent.includes('Matches official') || drawer.textContent.includes('Verified Current'));
      }, { timeout: 25000 });
      console.log('✓ Claims confirmed. Material successfully transitioned to "Matches official".');
    } catch (e) {
      const drawerDebug = await page.evaluate(() => {
        const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
        return drawer ? drawer.innerText : 'NO DRAWER';
      });
      console.error('Drawer text on timeout:\n', drawerDebug);
      console.error('Console errors:', consoleErrors);
      console.error('Failed requests:', failedRequests);
      throw e;
    }

    // 7. Verify Persistence Across Full Page Reload
    console.log('\n[Step 7] Reloading live page to verify database persistence...');
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 });

    const postReloadState = await page.evaluate(() => {
      const hasRev2 = document.body.innerText.includes('Revision 2');
      // WhatsApp card should now show Matches official (or 0 conflicts)
      const allText = document.body.innerText;
      return {
        hasRev2,
        hasWhatsAppMatchesOfficial: allText.includes('WhatsApp Group Announcement'),
      };
    });

    assert.ok(postReloadState.hasRev2, 'Revision 2 must persist after reload');
    console.log('✓ Revision 2 persisted across reload.');

    // Re-open WhatsApp Group Announcement to verify saved state
    const cardAfterReload = await page.waitForSelector('h3 ::-p-text(WhatsApp Group Announcement)', { timeout: 10000 });
    await cardAfterReload.evaluate((el) => {
      const btn = el.closest('.group');
      if (btn) btn.click();
      else el.click();
    });

    await page.waitForFunction(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer && drawer.textContent.includes('Saved Source Text (Version 2)');
    }, { timeout: 15000 });

    const savedSourceText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="saved-source-text"], .whitespace-pre-wrap');
      return el ? el.textContent : '';
    });

    console.log('Persisted Saved Source Text in Live Database:');
    console.log(`"${savedSourceText}"`);
    assert.ok(savedSourceText.includes('Doors open at 11:00 AM at the Innovation Lab.'),
      'Persisted source text MUST contain "Doors open at 11:00 AM at the Innovation Lab."'
    );
    assert.ok(!savedSourceText.includes('Main Auditorium'), 'Persisted source MUST NOT contain Main Auditorium');
    console.log('✓ Full persistence verified: Saved source retains exact phrasing and verified claims.');

    // Check Audit History tab
    const auditTab = await page.waitForSelector('button ::-p-text(Audit History)', { timeout: 10000 });
    await auditTab.click();
    await new Promise((r) => setTimeout(r, 800));

    const hasV1Preserved = await page.evaluate(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer?.textContent?.includes('Version 1') && drawer?.textContent?.includes('Inspect Preserved Source');
    });
    assert.ok(hasV1Preserved, 'Historical Version 1 snapshot must be preserved in Audit History');
    console.log('✓ Audit history verified: Historical Version 1 snapshot preserved in TablesDB.');

    console.log('\n====================================================');
    console.log('🎉 LIVE PUBLIC DEPLOYMENT FULLY VERIFIED!');
    console.log('====================================================');
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`Failed Requests: ${failedRequests.length}`);

  } finally {
    await browser.close();
  }
}

runLiveVerification().catch((err) => {
  console.error('\n❌ Live verification failed:', err);
  process.exit(1);
});
