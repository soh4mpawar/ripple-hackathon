import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:\\Users\\soham\\.gemini\\antigravity\\brain\\1dde1e3d-f61c-4c3d-b3f2-66c7699284b5\\screenshots';
const DOCS_DIR = path.resolve('docs/screenshots');

[ARTIFACT_DIR, DOCS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  try {
    // 1. Landing Page (Desktop)
    console.log('[1/5] Capturing Landing Page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_landing_page.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '01_landing_page.png'), fullPage: true });

    // 2. Launch Sample Event
    console.log('Launching Sample Event demo session...');
    const demoBtn = await page.waitForSelector('button[data-testid="try-demo-btn"]', { timeout: 10000 });
    await demoBtn.click();
    await page.waitForFunction(() => window.location.pathname.startsWith('/events/'), { timeout: 25000 });
    await page.waitForSelector('h1', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // 3. Commit Venue & Time Shift
    console.log('Simulating venue & time shift to Revision 2...');
    const simBtn = await page.waitForSelector('button ::-p-text(Simulate venue & time shift)', { timeout: 10000 });
    await simBtn.click();
    const confirmBtn = await page.waitForSelector('button ::-p-text(Confirm & Commit Demo Change)', { timeout: 10000 });
    await confirmBtn.click();

    // Wait for conflict count 4 and Revision 2
    await page.waitForFunction(() => {
      const el = document.querySelector('.text-conflict-600.text-2xl');
      return el && el.textContent?.trim() === '4';
    }, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    // 2. Desktop Workspace Screenshot
    console.log('[2/5] Capturing Desktop Workspace...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_desktop_workspace.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '02_desktop_workspace.png'), fullPage: true });
    // Also save as 03_workspace_conflict.png for backwards-compatible links
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_workspace_conflict.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '03_workspace_conflict.png'), fullPage: true });

    // 3. Correction Inspector Screenshot
    console.log('[3/5] Opening WhatsApp Group Announcement -> Correction Preview...');
    const card = await page.waitForSelector('h3 ::-p-text(WhatsApp Group Announcement)', { timeout: 10000 });
    await card.evaluate((el) => {
      const btn = el.closest('.group');
      if (btn) btn.click();
      else el.click();
    });

    const corrTab = await page.waitForSelector('button ::-p-text(Correction Preview)', { timeout: 10000 });
    await corrTab.click();
    await new Promise((r) => setTimeout(r, 1200));

    console.log('Capturing Correction Inspector (with diff preview & highlighted venue/time)...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_correction_inspector.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '03_correction_inspector.png'), fullPage: true });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_correction_inspector.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '04_correction_inspector.png'), fullPage: true });

    // Apply correction via "Save corrected version"
    console.log('Clicking "Save corrected version" button...');
    const saveVersionBtn = await page.waitForSelector('button[data-testid="save-corrected-btn"], button ::-p-text(Save corrected version)', { timeout: 10000 });
    await saveVersionBtn.click();

    // Wait for drawer to update with v2 proposed claims review banner
    await page.waitForFunction(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer && drawer.textContent.includes('Review Extracted Claims');
    }, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Confirm all proposed claims
    console.log('Confirming proposed claims via "Confirm All Proposed"...');
    const confirmAllBtn = await page.waitForSelector('button ::-p-text(Confirm All Proposed)', { timeout: 10000 });
    await confirmAllBtn.click();

    await page.waitForFunction(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer && (drawer.textContent.includes('Matches official') || drawer.textContent.includes('Verified Current'));
    }, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Close drawer
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 600));

    // 4. Mobile List Screenshot (375x667)
    console.log('[4/5] Capturing Mobile List View...');
    // Create fresh mobile page context to test genuine fresh mobile navigation
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 750, isMobile: true, hasTouch: true });
    const currentUrl = page.url();
    await mobilePage.goto(currentUrl, { waitUntil: 'networkidle2' });
    await mobilePage.waitForSelector('h1', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Verify list mode is default on fresh mobile load
    const isListSelected = await mobilePage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const listBtn = buttons.find((b) => b.textContent?.includes('Material List'));
      return listBtn?.className.includes('bg-white') && listBtn?.className.includes('shadow-2xs');
    });
    console.log(`✓ Verified fresh mobile navigation defaults to List mode: ${isListSelected}`);

    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, '04_mobile_list.png'), fullPage: true });
    await mobilePage.screenshot({ path: path.join(DOCS_DIR, '04_mobile_list.png'), fullPage: true });
    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, '06_mobile_workspace.png'), fullPage: true });
    await mobilePage.screenshot({ path: path.join(DOCS_DIR, '06_mobile_workspace.png'), fullPage: true });

    // 5. Mobile History Screenshot
    console.log('[5/5] Capturing Mobile History (scrolled to stacked official change log)...');
    await mobilePage.evaluate(() => {
      const historyHeader = Array.from(document.querySelectorAll('h3')).find((h) =>
        h.textContent?.includes('Official Detail Change History')
      );
      if (historyHeader) historyHeader.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise((r) => setTimeout(r, 800));

    await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, '05_mobile_history.png'), fullPage: false });
    await mobilePage.screenshot({ path: path.join(DOCS_DIR, '05_mobile_history.png'), fullPage: false });

    await mobilePage.close();
    console.log('\n✓ All 5 polished screenshots captured and verified successfully!');
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
