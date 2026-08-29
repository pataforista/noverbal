import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Exercises the exact update path app.js relies on to force a refresh once a
// new deploy lands: registration -> byte-diff on reg.update() -> skipWaiting
// in install -> clients.claim() in activate -> "controllerchange" on the page
// -> update toast shown -> reload picks up the new worker. This is the same
// standards-based sequence Firefox and Safari (not just Chromium) run; the
// project's own Playwright setup is Chromium-only (see playwright.config.js).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SW_PATH = path.join(__dirname, '..', 'service-worker.js');

test.describe.configure({ mode: 'serial' });

test('a new Service Worker deploy is detected and offers a reload', async ({ page }) => {
  const original = fs.readFileSync(SW_PATH, 'utf8');
  try {
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    const save = page.locator('#btnSaveIntro');
    if (await save.isVisible().catch(() => false)) await save.click();

    // Wait for the first-ever registration to finish controlling the page.
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);

    // Simulate a new deploy: change the byte content served at ./service-worker.js.
    fs.writeFileSync(SW_PATH, `${original}\n// test-triggered redeploy\n`);

    const controllerChanged = page.evaluate(() => new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(true), { once: true });
    }));

    // Mirrors app.js's own periodic/visibility-triggered check.
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
    });

    await controllerChanged;

    // app.js wires this exact toast on 'controllerchange' (showUpdateToast).
    await expect(page.locator('#updateToast')).not.toHaveClass(/hidden/);

    // "Actualizar" reloads the page onto the new worker.
    await page.locator('#btnUpdateNow').click();
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  } finally {
    fs.writeFileSync(SW_PATH, original);
  }
});
