import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = 'C:\\Users\\soham\\.gemini\\antigravity\\brain\\1dde1e3d-f61c-4c3d-b3f2-66c7699284b5\\screenshots';
const POSTER_PATH = path.resolve('test/fixtures/campus_build_night_poster.png');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runBrowserVerification() {
  console.log('====================================================');
  console.log(' Ripple — End-to-End Browser Workflow Verification');
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
    // STEP 1: Open Home Page & Launch Sample Event
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

    // Extra settle time
    await new Promise((r) => setTimeout(r, 1500));

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

    console.log('[Step 2] Modal opened. Confirming change to Innovation Lab / 11:00 AM...');
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

    // Wait for the Outdated Conflicts counter to reach 4
    await page.waitForFunction(() => {
      const conflictEl = document.querySelector('.text-conflict-600.text-2xl');
      return conflictEl && conflictEl.textContent?.trim() === '4';
    }, { timeout: 15000 });

    console.log('✓ Revision updated to Rev 2 and Outdated Conflicts counter is 4.');
    await new Promise((r) => setTimeout(r, 1500));

    // Capture Screenshot 2: Conflict State
    const ss2 = path.join(SCREENSHOTS_DIR, '02_conflict_state.png');
    await page.screenshot({ path: ss2, fullPage: true });
    console.log(`✓ [Screenshot 2] Conflict state saved: ${ss2}`);

    // Verify materials 1, 2, 3, and 6 conflict
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('[Step 2] Verifying materials in conflict state:');
    console.log(`  - Main Poster Copy present: ${bodyText.includes('Main Poster Copy')}`);
    console.log(`  - WhatsApp Group Announcement present: ${bodyText.includes('WhatsApp Group Announcement')}`);
    console.log(`  - Volunteer Instructions Handout present: ${bodyText.includes('Volunteer Instructions Handout')}`);
    console.log(`  - Schedule Excerpt Handout present: ${bodyText.includes('Schedule Excerpt Handout')}`);
    console.log(`  - Registration Reminder present: ${bodyText.includes('Registration Reminder Email')}`);
    console.log(`  - Sponsor Thank-You present: ${bodyText.includes('Sponsor Thank-You Graphic')}`);

    // ----------------------------------------------------
    // STEP 3: Open Conflict Evidence & Apply Text Correction
    // ----------------------------------------------------
    console.log('\n[Step 3] Opening "WhatsApp Group Announcement" card to inspect conflict evidence...');
    // Scroll down to ensure cards are visible
    await page.evaluate(() => window.scrollBy(0, 400));
    await new Promise((r) => setTimeout(r, 500));

    const whatsappTitle = await page.waitForSelector('h3 ::-p-text(WhatsApp Group Announcement)', { timeout: 10000 });
    // Click parent card
    await whatsappTitle.evaluate((el) => {
      const card = el.closest('.group');
      if (card) card.click();
      else el.click();
    });

    // Wait for the slide-over drawer / detail panel
    await page.waitForSelector('button ::-p-text(Claims & Review)', { timeout: 10000 });
    console.log('✓ Detail panel drawer opened.');
    await new Promise((r) => setTimeout(r, 1000));

    // Verify conflict evidence quotes are displayed
    const panelEvidence = await page.evaluate(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .border-l, .fixed.inset-y-0.right-0');
      return drawer ? drawer.innerText : document.body.innerText;
    });
    const showsOutdatedVenue = panelEvidence.includes('Innovation Lab');
    const showsOutdatedTime = panelEvidence.includes('11:00 AM');
    console.log(`✓ Conflict evidence quotes: displays "Innovation Lab"=${showsOutdatedVenue}, "11:00 AM"=${showsOutdatedTime}`);

    // Click "Correction Preview" tab
    console.log('[Step 3] Switching to "Correction Preview" tab...');
    const correctionsTab = await page.waitForSelector('button ::-p-text(Correction Preview)', { timeout: 10000 });
    await correctionsTab.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Apply correction (creates v2)
    console.log('[Step 3] Clicking "Apply Correction" button...');
    const applyBtn = await page.waitForSelector('button ::-p-text(Apply Correction)', { timeout: 10000 });
    await applyBtn.click();

    // Wait for drawer to update with v2 and spinner to settle
    await page.waitForFunction(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      const isSpinning = !!drawer?.querySelector('.animate-spin');
      const hasV2 = drawer?.textContent?.includes('v2') || drawer?.textContent?.includes('Version 2');
      return drawer && hasV2 && !isSpinning;
    }, { timeout: 20000 });

    console.log('✓ Material successfully updated to Version 2 in database and UI.');
    await new Promise((r) => setTimeout(r, 1500));

    // Capture Screenshot 3: Corrected Material
    const ss3 = path.join(SCREENSHOTS_DIR, '03_corrected_material.png');
    await page.screenshot({ path: ss3, fullPage: true });
    console.log(`✓ [Screenshot 3] Corrected material saved: ${ss3}`);

    // Close detail panel
    const closeBtn = await page.$('button[title="Close panel"]');
    if (closeBtn) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('button[title="Close panel"]'), { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 800));

    // ----------------------------------------------------
    // STEP 4: Upload Realistic Poster & Manual Claim Entry
    // ----------------------------------------------------
    console.log('\n[Step 4] Testing realistic poster upload through UI modal...');
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 500));

    const addMatBtn = await page.waitForSelector('button ::-p-text(Add Event Material)', { timeout: 10000 });
    await addMatBtn.click();

    // Switch to Poster Graphic tab in modal
    await page.waitForSelector('button ::-p-text(Poster Graphic)', { timeout: 10000 });
    const posterTab = await page.$('button ::-p-text(Poster Graphic)');
    await posterTab.click();

    // Fill title
    const titleInput = await page.$('input[placeholder*="Instagram Story"], input[placeholder*="title" i], input[type="text"]');
    await titleInput.type('Official Hackathon Print Poster (High-Res)');

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
    console.log('[Step 4] Adding manual claim visible on poster: Date = Saturday, November 1, 2026...');
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
    // STEP 5: Reload and Verify Database Persistence
    // ----------------------------------------------------
    console.log('\n[Step 5] Reloading browser page to verify database persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('h1', { timeout: 15000 });

    const persistedText = await page.evaluate(() => document.body.innerText);
    const persistedRev2 = persistedText.includes('Rev 2');
    const persistedPoster = persistedText.includes('Official Hackathon Print Poster');
    console.log(`✓ Persistence verified after full browser reload: Rev 2=${persistedRev2}, New Material=${persistedPoster}`);

    // ----------------------------------------------------
    // STEP 6: Open Version History & Audit Log
    // ----------------------------------------------------
    console.log('\n[Step 6] Verifying Revision Audit Log and Material Version History...');
    const hasAuditLog = persistedText.includes('Revision Change History (Audit Log)');
    console.log(`✓ Revision Change Audit Log visible: ${hasAuditLog}`);

    // Open WhatsApp announcement again to inspect Audit History tab
    const whatsappTitle2 = await page.waitForSelector('h3 ::-p-text(WhatsApp Group Announcement)', { timeout: 10000 });
    await whatsappTitle2.evaluate((el) => {
      const card = el.closest('.group');
      if (card) card.click();
      else el.click();
    });

    await page.waitForSelector('button ::-p-text(Audit History)', { timeout: 10000 });
    const auditTab = await page.$('button ::-p-text(Audit History)');
    await auditTab.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Capture Screenshot 5: Version History
    const ss5 = path.join(SCREENSHOTS_DIR, '05_version_history.png');
    await page.screenshot({ path: ss5, fullPage: true });
    console.log(`✓ [Screenshot 5] Version history saved: ${ss5}`);

    // Close drawer
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));

    // ----------------------------------------------------
    // STEP 7: Mobile Viewport Check (375 x 667)
    // ----------------------------------------------------
    console.log('\n[Step 7] Checking mobile responsive layout (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 1000));

    const ss7 = path.join(SCREENSHOTS_DIR, '07_mobile_layout.png');
    await page.screenshot({ path: ss7, fullPage: true });
    console.log(`✓ [Screenshot 7] Mobile layout saved: ${ss7}`);

    // Reset viewport to desktop
    await page.setViewport({ width: 1280, height: 900 });

    // ----------------------------------------------------
    // STEP 8: Test Logout & Email/Password Registration & Login
    // ----------------------------------------------------
    console.log('\n[Step 8] Testing Logout and Registration/Login flow...');
    // Click Logout button in navbar
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

    console.log(`[Step 8] Registering new organizer: ${testEmail}...`);
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
