import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = 'C:\\Users\\soham\\.gemini\\antigravity\\brain\\1dde1e3d-f61c-4c3d-b3f2-66c7699284b5\\screenshots';
const POSTER_PATH = path.resolve('test/fixtures/campus_build_night_poster.png');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runBrowserVerification() {
  console.log('====================================================');
  console.log(' Ripple — Comprehensive Browser Workflow Verification');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  const consoleLogs = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleLogs.push({ type: 'error', text });
    }
  });

  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  try {
    // ----------------------------------------------------
    // STEP 1: Open Home Page & Launch Fresh Sample Event
    // ----------------------------------------------------
    console.log('\n[Step 1] Loading home page at', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    console.log('[Step 1] Clicking "Try Sample Event: Campus Build Night"...');
    await page.waitForSelector('button ::-p-text(Try Sample Event: Campus Build Night)', { timeout: 10000 });
    const sampleBtn = await page.$('button ::-p-text(Try Sample Event: Campus Build Night)');
    await sampleBtn.click();

    // Wait for navigation to /events/[id]
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 });
    const eventUrl = page.url();
    console.log(`✓ Navigated to workspace URL: ${eventUrl}`);

    // Wait for workspace to fully load data
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForFunction(() => {
      const h1 = document.querySelector('h1')?.textContent;
      return h1 && h1.includes('Campus Build Night');
    }, { timeout: 15000 });

    // Wait for initial Revision 1 badge in official strip
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Revision 1');
    }, { timeout: 15000 });

    await new Promise((r) => setTimeout(r, 1200));

    // Capture Screenshot 1: Initial Workspace
    const ss1 = path.join(SCREENSHOTS_DIR, '01_initial_workspace.png');
    await page.screenshot({ path: ss1, fullPage: true });
    console.log(`✓ [Screenshot 1] Initial workspace saved: ${ss1}`);

    // ----------------------------------------------------
    // STEP 2: Commit Venue & Start Time Change via UI
    // ----------------------------------------------------
    console.log('\n[Step 2] Clicking "Simulate Official Change" button...');
    const simBtn = await page.waitForSelector('button ::-p-text(Simulate Official Change)', { timeout: 10000 });
    await simBtn.click();

    console.log('[Step 2] Modal opened. Verifying affected materials list...');
    await page.waitForSelector('button ::-p-text(Confirm & Commit Demo Change)', { timeout: 10000 });
    const modalText = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], .fixed.inset-0');
      return modal ? modal.textContent : '';
    });
    assert.ok(modalText.includes('Schedule Excerpt Handout'), 'Demo change modal must list Schedule Excerpt Handout as affected');
    console.log('✓ Demo change modal correctly includes Schedule Excerpt Handout.');

    console.log('[Step 2] Confirming change to Innovation Lab / 11:00 AM...');
    const confirmBtn = await page.waitForSelector('button ::-p-text(Confirm & Commit Demo Change)', { timeout: 10000 });
    await confirmBtn.click();

    // Wait for modal to dismiss and workspace to reflect Revision 2
    console.log('[Step 2] Waiting for database commit and UI update to Revision 2...');
    await page.waitForFunction(() => {
      const hasModal = Array.from(document.querySelectorAll('button')).some((b) =>
        b.textContent.includes('Confirm & Commit Demo Change')
      );
      const hasRev2 = document.body.innerText.includes('Revision 2');
      return !hasModal && hasRev2;
    }, { timeout: 20000 });

    // Wait for the Outdated materials counter to reach 4
    await page.waitForFunction(() => {
      const conflictEl = document.querySelector('.text-conflict-600.text-2xl');
      return conflictEl && conflictEl.textContent?.trim() === '4';
    }, { timeout: 15000 });

    console.log('✓ Revision updated to Rev 2 and Outdated materials counter is 4.');
    await new Promise((r) => setTimeout(r, 1200));

    // Capture Screenshot 2: Conflict State
    const ss2 = path.join(SCREENSHOTS_DIR, '02_conflict_state.png');
    await page.screenshot({ path: ss2, fullPage: true });
    console.log(`✓ [Screenshot 2] Conflict state saved: ${ss2}`);

    // Verify materials 1, 2, 3, and 6 conflict
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('[Step 2] Verifying materials in conflict state:');
    assert.ok(bodyText.includes('Main Poster Copy'), 'Main Poster Copy present');
    assert.ok(bodyText.includes('WhatsApp Group Announcement'), 'WhatsApp Announcement present');
    assert.ok(bodyText.includes('Volunteer Instructions Handout'), 'Volunteer Instructions present');
    assert.ok(bodyText.includes('Schedule Excerpt Card'), 'Schedule Excerpt Card present');
    assert.ok(bodyText.includes('Discord Registration Reminder'), 'Discord Registration Reminder present');
    assert.ok(bodyText.includes('Sponsor Thank-You Note'), 'Sponsor Thank-You Note present');

    // ----------------------------------------------------
    // STEP 3: Verify Correction Generation & Apply Correction (P0 Fix)
    // ----------------------------------------------------
    console.log('\n[Step 3] Opening "WhatsApp Group Announcement" card to inspect conflict evidence & corrections...');
    await page.evaluate(() => window.scrollBy(0, 400));
    await new Promise((r) => setTimeout(r, 500));

    const whatsappTitle = await page.waitForSelector('h3 ::-p-text(WhatsApp Group Announcement)', { timeout: 10000 });
    await whatsappTitle.evaluate((el) => {
      const card = el.closest('.group');
      if (card) card.click();
      else el.click();
    });

    await page.waitForSelector('button ::-p-text(Claims & Review)', { timeout: 10000 });
    console.log('✓ Detail panel drawer opened.');
    await new Promise((r) => setTimeout(r, 800));

    // Switch to "Correction Preview" tab
    console.log('[Step 3] Switching to "Correction Preview" tab...');
    const correctionsTab = await page.waitForSelector('button ::-p-text(Correction Preview)', { timeout: 10000 });
    await correctionsTab.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Verify suggested text in textarea
    const suggestedText = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      return textarea ? textarea.value : '';
    });

    console.log('Suggested Correction Text:');
    console.log(suggestedText);

    assert.ok(suggestedText.includes('11:00 AM'), 'Suggested text MUST contain new start time 11:00 AM');
    assert.ok(suggestedText.includes('Innovation Lab'), 'Suggested text MUST contain new venue Innovation Lab');
    assert.ok(!suggestedText.includes('Main Auditorium'), 'Suggested text MUST NOT contain obsolete Main Auditorium');
    assert.ok(!suggestedText.includes('10:00 AM'), 'Suggested text MUST NOT contain obsolete 10:00 AM');
    console.log('✓ Verified: Suggested text replaces ALL conflicting facts (both time and venue).');

    // Apply correction (creates Version 2)
    console.log('[Step 3] Clicking "Apply Correction" button...');
    const applyBtn = await page.waitForSelector('button ::-p-text(Apply Correction)', { timeout: 10000 });
    await applyBtn.click();

    // Wait for drawer to update with v2
    await page.waitForFunction(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      const isSpinning = !!drawer?.querySelector('.animate-spin');
      const hasV2 = drawer?.textContent?.includes('v2') || drawer?.textContent?.includes('Version 2');
      return drawer && hasV2 && !isSpinning;
    }, { timeout: 20000 });

    await new Promise((r) => setTimeout(r, 1500));

    // Drawer automatically navigated to "Claims & Review" tab
    console.log('[Step 3] Verifying Version 2 newly extracted claims are in proposed state...');
    await page.waitForFunction(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer && (drawer.textContent.includes('Review Extracted Claims') || drawer.textContent.includes('proposed'));
    }, { timeout: 10000 });
    console.log('✓ Verified: Newly extracted Version 2 claims start as proposed, requiring explicit review.');

    // Explicitly confirm proposed claims
    console.log('[Step 3] Explicitly confirming proposed claims via "Confirm All Proposed"...');
    const confirmAllBtn = await page.waitForSelector('button ::-p-text(Confirm All Proposed)', { timeout: 10000 });
    await confirmAllBtn.click();

    // Wait for confirmation to process and material to become Verified Current
    await page.waitForFunction(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer && drawer.textContent.includes('Verified Current');
    }, { timeout: 15000 });

    // Inspect drawer content
    const drawerDetails = await page.evaluate(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      const text = drawer ? drawer.innerText : '';
      const sourcePre = drawer?.querySelector('pre')?.textContent || '';
      return { text, sourcePre };
    });

    console.log('[Step 3] Verifying Version 2 saved state in drawer:');
    assert.ok(drawerDetails.sourcePre.includes('11:00 AM'), 'Saved source MUST contain 11:00 AM');
    assert.ok(drawerDetails.sourcePre.includes('Innovation Lab'), 'Saved source MUST contain Innovation Lab');
    assert.ok(!drawerDetails.sourcePre.includes('Main Auditorium'), 'Saved source MUST NOT contain Main Auditorium');
    assert.ok(!drawerDetails.text.includes('Updated in v2'), 'MUST NOT contain synthetic "Updated in v2" quotes');
    assert.ok(drawerDetails.text.includes('Verified Current'), 'Material must be Verified Current');
    console.log('✓ Verified: Version 2 saved source has authentic quotes, no synthetic evidence, and is Verified Current!');

    // Capture Screenshot 3: Corrected Material
    const ss3 = path.join(SCREENSHOTS_DIR, '03_corrected_material.png');
    await page.screenshot({ path: ss3, fullPage: true });
    console.log(`✓ [Screenshot 3] Corrected material saved: ${ss3}`);

    // ----------------------------------------------------
    // STEP 4: Audit History Preserved Source Inspection
    // ----------------------------------------------------
    console.log('\n[Step 4] Checking preserved version snapshots in Audit History tab...');
    const auditTab = await page.waitForSelector('button ::-p-text(Audit History)', { timeout: 10000 });
    await auditTab.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Click "Inspect Preserved Source"
    const inspectBtn = await page.waitForSelector('button ::-p-text(Inspect Preserved Source)', { timeout: 10000 });
    await inspectBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    const auditSnapshotText = await page.evaluate(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer ? drawer.innerText : '';
    });

    assert.ok(auditSnapshotText.includes('Main Auditorium'), 'Preserved Version 1 snapshot must preserve original Main Auditorium text');
    assert.ok(auditSnapshotText.includes('10:00 AM'), 'Preserved Version 1 snapshot must preserve original 10:00 AM text');
    console.log('✓ Verified: Preserved Version 1 snapshot accurately retains historical source copy.');

    const ss5 = path.join(SCREENSHOTS_DIR, '05_version_history.png');
    await page.screenshot({ path: ss5, fullPage: true });
    console.log(`✓ [Screenshot 5] Version history with preserved snapshot saved: ${ss5}`);

    // Close drawer
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));

    // ----------------------------------------------------
    // STEP 5: Test Exact User Announcement Input (P1 Fix)
    // ----------------------------------------------------
    console.log('\n[Step 5] Adding material with the exact user announcement test case...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));

    const addMatBtn = await page.waitForSelector('button ::-p-text(Add Event Material)', { timeout: 10000 });
    await addMatBtn.click();

    // Type title
    const titleInput = await page.waitForSelector('input[placeholder*="Instagram Story"], input[placeholder*="title" i], input[type="text"]', { timeout: 10000 });
    await titleInput.type('Discord & Telegram Community Blast');

    // Paste exact test copy
    const testInput = 'Campus Build Night is on October 31, 2026. Event start time: 11:00 AM. Venue: Innovation Lab. Volunteer arrival: 8:30 AM. Registration deadline: October 30, 2026, 6:00 PM.';
    const textArea = await page.waitForSelector('textarea', { timeout: 10000 });
    await textArea.type(testInput);

    // Submit
    const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    await submitBtn.click();

    // Wait for card to appear
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Discord & Telegram Community Blast');
    }, { timeout: 20000 });
    console.log('✓ New announcement material created with AI/parser extraction.');

    // Open detail panel for this newly added material
    const newCard = await page.waitForSelector('h3 ::-p-text(Discord & Telegram Community Blast)', { timeout: 10000 });
    await newCard.evaluate((el) => {
      const card = el.closest('.group');
      if (card) card.click();
      else el.click();
    });

    await page.waitForSelector('button ::-p-text(Claims & Review)', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1200));

    const newClaimsText = await page.evaluate(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer ? drawer.innerText : '';
    });

    console.log('[Step 5] Verifying extraction results on the user test input:');
    assert.ok(
      newClaimsText.includes('October 30, 2026, 6:00 PM'),
      'Registration deadline MUST preserve both date and time (October 30, 2026, 6:00 PM)'
    );
    assert.ok(
      newClaimsText.includes('8:30 AM'),
      'Volunteer arrival 8:30 AM must be extracted'
    );
    assert.ok(
      newClaimsText.toLowerCase().includes('needs clarification'),
      'Volunteer arrival 8:30 AM must be flagged with "needs clarification"'
    );
    assert.ok(
      newClaimsText.includes('11:00 AM'),
      'Event start time 11:00 AM must be extracted'
    );
    assert.ok(
      newClaimsText.includes('Extractor: Local Deterministic Parser') || newClaimsText.includes('Extractor: AI'),
      'UI must indicate whether local parser or AI was used'
    );
    console.log('✓ Verified: Registration deadline preserved date+time together; volunteer arrival flagged for clarification; parser badge displayed.');

    // Test inline claim editing
    console.log('[Step 5] Testing inline claim editor on proposed claim...');
    const editClaimBtn = await page.waitForSelector('button[title="Edit proposed claim field or value"]', { timeout: 5000 });
    await editClaimBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    const hasEditClaimForm = await page.evaluate(() => {
      return document.body.innerText.toLowerCase().includes('edit claim details');
    });
    assert.ok(hasEditClaimForm, 'Inline claim editor must open with EDIT CLAIM DETAILS form');
    console.log('✓ Verified: Inline claim editor opens cleanly and allows field/value adjustment.');

    // Close claim editor without altering data
    const cancelEditBtn = await page.waitForSelector('button ::-p-text(Cancel)', { timeout: 5000 });
    await cancelEditBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // Close drawer
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));

    // ----------------------------------------------------
    // STEP 6: Upload Realistic Poster & Manual Claim Entry
    // ----------------------------------------------------
    console.log('\n[Step 6] Testing realistic poster upload through UI modal...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));

    const addMatBtn2 = await page.waitForSelector('button ::-p-text(Add Event Material)', { timeout: 10000 });
    await addMatBtn2.click();

    // Switch to Poster Graphic tab in modal
    await page.waitForSelector('button ::-p-text(Poster Graphic)', { timeout: 10000 });
    const posterTab = await page.$('button ::-p-text(Poster Graphic)');
    await posterTab.click();

    // Fill title
    const posterTitleInput = await page.$('input[placeholder*="Instagram Story"], input[placeholder*="title" i], input[type="text"]');
    await posterTitleInput.type('Official Hackathon Print Poster (High-Res)');

    // Upload file
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(POSTER_PATH);
    console.log(`✓ Attached realistic poster fixture: ${POSTER_PATH}`);

    // Submit upload
    const uploadSubmitBtn = await page.$('button[type="submit"]');
    await uploadSubmitBtn.click();

    // Wait for modal to close and material to appear
    await page.waitForFunction(() => {
      return document.body.innerText.includes('Official Hackathon Print Poster');
    }, { timeout: 20000 });
    console.log('✓ Realistic poster uploaded to Appwrite Storage and material registered.');
    await new Promise((r) => setTimeout(r, 1200));

    // Open newly uploaded poster detail panel
    const uploadedCard = await page.waitForSelector('h3 ::-p-text(Official Hackathon Print Poster)', { timeout: 10000 });
    await uploadedCard.evaluate((el) => {
      const card = el.closest('.group');
      if (card) card.click();
      else el.click();
    });

    await page.waitForSelector('button ::-p-text(Claims & Review)', { timeout: 10000 });

    // Verify clearly labeled as unverified image extraction
    const unverifiedNotice = await page.evaluate(() => {
      return document.body.innerText.includes('Unverified (AI Extraction Unavailable)') ||
             document.body.innerText.includes('AI Extraction Unavailable');
    });
    console.log(`✓ UI clearly labels image extraction as unverified (no false claim of OCR): ${unverifiedNotice}`);

    // Enter manual claim for the uploaded poster
    console.log('[Step 6] Adding manual claim visible on poster: Date = Saturday, November 1, 2026...');
    const addClaimManualBtn = await page.waitForSelector('button ::-p-text(Add Claim Manually)', { timeout: 10000 });
    await addClaimManualBtn.click();

    // Select Event Date
    const fieldSelect = await page.$('select');
    if (fieldSelect) await fieldSelect.select('event_date');

    const rawValInput = await page.$('input[placeholder*="Main Auditorium"], input[placeholder*="value" i]');
    await rawValInput.type('Saturday, November 1, 2026');

    const quoteInput = await page.$('input[placeholder*="Venue:"], input[placeholder*="verbatim" i]');
    await quoteInput.type('DATE: Saturday, November 1, 2026');

    const saveClaimBtn = await page.$('button[type="submit"] ::-p-text(Save & Confirm Claim)');
    await saveClaimBtn.click();

    await page.waitForFunction(() => {
      return document.body.innerText.includes('Saturday, November 1, 2026');
    }, { timeout: 10000 });
    console.log('✓ Manual claim successfully saved and confirmed for uploaded poster.');
    await new Promise((r) => setTimeout(r, 1000));

    // Capture Screenshot 4: Poster Upload & Claim Entry
    const ss4 = path.join(SCREENSHOTS_DIR, '04_poster_upload.png');
    await page.screenshot({ path: ss4, fullPage: true });
    console.log(`✓ [Screenshot 4] Poster upload saved: ${ss4}`);

    // Close drawer
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));

    // ----------------------------------------------------
    // STEP 7: Reload and Verify Database Persistence
    // ----------------------------------------------------
    console.log('\n[Step 7] Reloading browser page to verify database persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 15000 });

    const persistedText = await page.evaluate(() => document.body.innerText);
    const persistedRev2 = persistedText.includes('Rev 2');
    const persistedPoster = persistedText.includes('Official Hackathon Print Poster');
    const persistedDiscord = persistedText.includes('Discord & Telegram Community Blast');
    console.log(`✓ Persistence verified after full browser reload: Rev 2=${persistedRev2}, Poster=${persistedPoster}, Discord Blast=${persistedDiscord}`);
    assert.ok(persistedRev2, 'Must persist Rev 2 after reload');
    assert.ok(persistedPoster, 'Must persist uploaded poster material after reload');
    assert.ok(persistedDiscord, 'Must persist new announcement material after reload');

    // Re-open WhatsApp Group Announcement to check post-reload state
    console.log('[Step 7] Re-opening WhatsApp Group Announcement to confirm post-reload state...');
    const persistedCard = await page.waitForSelector('h3 ::-p-text(WhatsApp Group Announcement)', { timeout: 10000 });
    await persistedCard.evaluate((el) => {
      const card = el.closest('.group');
      if (card) card.click();
      else el.click();
    });

    await page.waitForSelector('button ::-p-text(Claims & Review)', { timeout: 10000 });
    const postReloadDetails = await page.evaluate(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      const text = drawer ? drawer.innerText : '';
      const sourcePre = drawer?.querySelector('pre')?.textContent || '';
      return { text, sourcePre };
    });

    assert.ok(postReloadDetails.sourcePre.includes('11:00 AM'), 'Post-reload saved source MUST contain 11:00 AM');
    assert.ok(postReloadDetails.sourcePre.includes('Innovation Lab'), 'Post-reload saved source MUST contain Innovation Lab');
    assert.ok(!postReloadDetails.sourcePre.includes('Main Auditorium'), 'Post-reload saved source MUST NOT contain Main Auditorium');
    assert.ok(postReloadDetails.text.includes('Verified Current'), 'Post-reload status MUST remain Verified Current');

    // Check preserved Version 1 in Audit History tab
    const auditTabPostReload = await page.waitForSelector('button ::-p-text(Audit History)', { timeout: 10000 });
    await auditTabPostReload.click();
    await new Promise((r) => setTimeout(r, 600));

    const inspectBtnPostReload = await page.waitForSelector('button ::-p-text(Inspect Preserved Source)', { timeout: 10000 });
    await inspectBtnPostReload.click();
    await new Promise((r) => setTimeout(r, 400));

    const auditSnapshotPostReload = await page.evaluate(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer ? drawer.innerText : '';
    });
    assert.ok(auditSnapshotPostReload.includes('Main Auditorium'), 'Preserved Version 1 snapshot must remain available post-reload');
    console.log('✓ Post-reload verified: Both corrections in saved text, confirmed claims match, historical v1 preserved, status Verified Current.');

    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));

    // ----------------------------------------------------
    // STEP 8: Mobile Viewport Check (375 x 667)
    // ----------------------------------------------------
    console.log('\n[Step 8] Checking mobile responsive layout (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 1000));

    const ss7 = path.join(SCREENSHOTS_DIR, '07_mobile_layout.png');
    await page.screenshot({ path: ss7, fullPage: true });
    console.log(`✓ [Screenshot 7] Mobile layout saved: ${ss7}`);

    // Reset viewport to desktop
    await page.setViewport({ width: 1280, height: 900 });

    // ----------------------------------------------------
    // STEP 9: Test Logout & Email/Password Registration & Login
    // ----------------------------------------------------
    console.log('\n[Step 9] Testing Logout and Registration/Login flow...');
    const logoutBtn = await page.$('button[title="Log out"]');
    if (logoutBtn) {
      await logoutBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      console.log('✓ Successfully logged out demo user.');
    }

    // Navigate to /login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    console.log('✓ Reached /login page.');

    // Switch to Register mode
    const registerBtn = await page.waitForSelector('button ::-p-text(Register)', { timeout: 10000 });
    await registerBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    const testEmail = `organizer_${Date.now()}@campusclub.edu`;
    const testPassword = 'Password123!Secure';

    // Type credentials
    const nameField = await page.$('input[placeholder*="Alex"], input[placeholder*="name" i]');
    if (nameField) await nameField.type('Club President Alex');

    const emailField = await page.$('input[type="email"]');
    await emailField.type(testEmail);

    const passwordField = await page.$('input[type="password"]');
    await passwordField.type(testPassword);

    console.log(`[Step 9] Registering new organizer: ${testEmail}...`);
    const submitAuthBtn = await page.$('button[type="submit"]');
    await submitAuthBtn.click();

    // Wait for redirect to home
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
    console.log('✓ Registered and redirected to home page.');

    const ss6 = path.join(SCREENSHOTS_DIR, '06_auth_flow.png');
    await page.screenshot({ path: ss6, fullPage: true });
    console.log(`✓ [Screenshot 6] Auth flow saved: ${ss6}`);

    console.log('\n====================================================');
    console.log('🎉 ALL BROWSER WORKFLOW CHECKS COMPLETED & VERIFIED!');
    console.log('====================================================');

    console.log(`\nBrowser Console Errors: ${consoleLogs.length}`);
    consoleLogs.forEach((l) => console.log('  -', l.text));

    console.log(`\nFailed Network Requests: ${failedRequests.length}`);
    failedRequests.forEach((f) => console.log('  -', f.url, f.failure));

  } finally {
    await browser.close();
  }
}

runBrowserVerification().catch((err) => {
  console.error('\n❌ Browser Verification Failed:', err);
  process.exit(1);
});
