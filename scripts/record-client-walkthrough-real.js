#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = 'https://crm.festlift.pt';
const EMAIL = process.env.CLIENT_DEMO_EMAIL || 'client@festlift.pt';
const PASSWORD = process.env.CLIENT_DEMO_PASSWORD || 'client123';

const VIEWPORT = { width: 1920, height: 1080 };

const TOUR = [
  { name: 'dashboard', url: `${BASE}/pages/client/dashboard.html`, waitMs: 7000 },
  { name: 'my-lifts', url: `${BASE}/pages/client/my-lifts.html`, waitMs: 7000 },
  { name: 'requests', url: `${BASE}/pages/client/requests.html`, waitMs: 7000 },
  { name: 'history', url: `${BASE}/pages/client/history.html`, waitMs: 7000 },
  { name: 'documentation', url: `${BASE}/pages/client/documentation.html`, waitMs: 7000 },
  { name: 'ai-assistant', url: `${BASE}/pages/ai-assistant/ai-assistant.html`, waitMs: 9000 },
  { name: 'support', url: `${BASE}/pages/client/support.html`, waitMs: 7000 },
  { name: 'notifications', url: `${BASE}/pages/client/notifications.html`, waitMs: 6000 },
  { name: 'profile', url: `${BASE}/pages/client/profile.html`, waitMs: 6000 },
];

async function waitForPageReady(page, waitMs) {
  await page.waitForLoadState('domcontentloaded', { timeout: 90000 });
  await page.waitForTimeout(waitMs);
}

async function recordVideo() {
  const root = path.resolve(__dirname, '..');
  const recordingDir = path.join(root, 'docs', 'media', 'recordings');
  const finalPath = path.join(root, 'docs', 'user-manual-short.webm');
  const backupPath = path.join(root, 'docs', 'user-manual-short-real.webm');

  fs.mkdirSync(recordingDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: {
      dir: recordingDir,
      size: VIEWPORT,
    },
  });

  const page = await context.newPage();

  await page.goto(`${BASE}/pages/auth/login.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);

  for (const step of TOUR) {
    await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await waitForPageReady(page, step.waitMs);
    console.log(`Captured step: ${step.name}`);
  }

  const video = page.video();
  await context.close();
  await browser.close();

  const sourcePath = await video.path();
  fs.copyFileSync(sourcePath, finalPath);
  fs.copyFileSync(sourcePath, backupPath);

  const size = fs.statSync(finalPath).size;
  console.log(`Saved: ${finalPath}`);
  console.log(`Bytes: ${size}`);
}

recordVideo().catch((error) => {
  console.error(error);
  process.exit(1);
});
