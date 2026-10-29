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
    // 1. Landing Page
    console.log('Capturing Landing Page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_landing_page.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '01_landing_page.png'), fullPage: true });

    // 2. Launch Sample Event
    console.log('Launching Sample Event...');
    const demoBtn = await page.waitForSelector('button[data-testid="try-demo-btn"]', { timeout: 10000 });
    await demoBtn.click();
    await page.waitForFunction(() => window.location.pathname.startsWith('/events/'), { timeout: 25000 });
    await page.waitForSelector('h1', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Capture initial workspace
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_workspace_initial.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '02_workspace_initial.png'), fullPage: true });

    // 3. Simulate Venue & Time Shift
    console.log('Simulating Venue & Time Shift...');
    const simBtn = await page.waitForSelector('button ::-p-text(Simulate venue & time shift)', { timeout: 10000 });
    await simBtn.click();
    const confirmBtn = await page.waitForSelector('button ::-p-text(Confirm & Commit Demo Change)', { timeout: 10000 });
    await confirmBtn.click();

    // Wait for conflict count 4
    await page.waitForFunction(() => {
      const el = document.querySelector('.text-conflict-600.text-2xl');
      return el && el.textContent?.trim() === '4';
    }, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    // Capture conflict state
    console.log('Capturing Conflict Workspace...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_workspace_conflict.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '03_workspace_conflict.png'), fullPage: true });

    // 4. Open WhatsApp Group Announcement -> Correction Preview
    console.log('Opening WhatsApp Group Announcement Drawer...');
    const card = await page.waitForSelector('h3 ::-p-text(WhatsApp Group Announcement)', { timeout: 10000 });
    await card.evaluate((el) => {
      const btn = el.closest('.group');
      if (btn) btn.click();
      else el.click();
    });

    const corrTab = await page.waitForSelector('button ::-p-text(Correction Preview)', { timeout: 10000 });
    await corrTab.click();
    await new Promise((r) => setTimeout(r, 1200));

    console.log('Capturing Correction Inspector...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_correction_inspector.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '04_correction_inspector.png'), fullPage: true });

    // Apply correction to produce Version 2 proposed claims
    console.log('Applying correction to view proposed claims review banner...');
    const applyBtn = await page.waitForSelector('button ::-p-text(Apply Correction)', { timeout: 10000 });
    await applyBtn.click();

    await page.waitForFunction(() => {
      const drawer = document.querySelector('aside, [role="dialog"], .fixed.inset-y-0.right-0');
      return drawer && drawer.textContent.includes('Review Extracted Claims');
    }, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('Capturing Claims Review...');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_claims_review.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '05_claims_review.png'), fullPage: true });

    // Close drawer
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 500));

    // 5. Mobile Layout (375x667)
    console.log('Capturing Mobile Workspace...');
    await page.setViewport({ width: 375, height: 667 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((r) => setTimeout(r, 1000));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_mobile_workspace.png'), fullPage: true });
    await page.screenshot({ path: path.join(DOCS_DIR, '06_mobile_workspace.png'), fullPage: true });

    console.log('✓ All redesign screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
