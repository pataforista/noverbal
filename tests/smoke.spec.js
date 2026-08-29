import { test, expect } from '@playwright/test';

// Dismiss the first-run intro modal if it's shown.
async function dismissIntro(page) {
  const save = page.locator('#btnSaveIntro');
  if (await save.isVisible().catch(() => false)) await save.click();
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.errors = errors;
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  await dismissIntro(page);
});

test('boots without console errors and fills the board', async ({ page }) => {
  await expect(page.locator('#statusText')).toHaveText(/Listo/);
  const tiles = await page.locator('#grid .tile').count();
  expect(tiles).toBeGreaterThan(50);
  expect(page.errors, page.errors.join('\n')).toHaveLength(0);
});

test('tapping a tile adds it to the phrase and it can be spoken', async ({ page }) => {
  await page.locator('#grid .tile:not([data-id="nav-anchor"])').first().click();
  await expect(page.locator('#chips .chip')).toHaveCount(1);
  // Speaking must not throw.
  await page.locator('#btnSpeak').click();
  expect(page.errors, page.errors.join('\n')).toHaveLength(0);
});

test('fixed core row is always visible (N-2)', async ({ page }) => {
  expect(await page.locator('#coreRow .tile').count()).toBeGreaterThanOrEqual(4);
});

test('system Back returns to "Todas" instead of leaving the app (N-4)', async ({ page }) => {
  await page.locator('#categoryBar .pill', { hasText: /.+/ }).nth(2).click();
  await page.goBack();
  await expect(page.locator('.breadcrumb-label')).toHaveText('Todas las palabras');
});

test('SOS button opens a menu, and its board item jumps to the emergency profile (N-5)', async ({ page }) => {
  await page.locator('#btnSOS').click();
  await expect(page.locator('#sosMenu')).toHaveClass(/open/);
  await page.locator('#sosGoBoard').click();
  await expect(page.locator('#headerProfile')).toHaveValue('sos');
  await expect(page.locator('#sosMenu')).not.toHaveClass(/open/);
});

test('SOS menu lists configured emergency contacts as tel: links', async ({ page }) => {
  await page.locator('#btnSettings').click();
  await page.locator('#newContactName').fill('Mamá');
  await page.locator('#newContactPhone').fill('+52 55 1234 5678');
  await page.locator('#btnAddContact').click();
  await page.locator('[data-close-dialog="settingsModal"]').click();

  await page.locator('#btnSOS').click();
  const contact = page.locator('.sos-contact', { hasText: 'Mamá' });
  await expect(contact).toHaveAttribute('href', 'tel:+525512345678');
});

test('no favorite stars in the communication view (N-9)', async ({ page }) => {
  expect(await page.locator('#grid .tile .tile-fav').count()).toBe(0);
});

test('grammar tags show a real part-of-speech, not the category initial (P1-9)', async ({ page }) => {
  await page.evaluate(() => document.body.classList.add('show-grammar'));
  const labels = await page.locator('#grid .tile .grammar-tag').evaluateAll(
    (els) => [...new Set(els.map((e) => e.textContent.trim().toUpperCase()))],
  );
  expect(labels.length).toBeGreaterThan(0);
  for (const l of labels) expect(['V', 'S', 'A', 'SO', 'O']).toContain(l);
});

test('paged mode shows fixed pages with working navigation (N-1)', async ({ page }) => {
  await page.locator('#categoryBar .pill', { hasText: 'Todas' }).first().click();
  // The toggle is a styled checkbox inside the (closed) Settings modal; activate
  // it programmatically, then verify the board reflows into pages.
  await page.evaluate(() => document.getElementById('pagedMode').click());
  await expect(page.locator('#pageControls')).toBeVisible();
  const perPage = await page.locator('#grid .tile:not([data-id="nav-anchor"])').count();
  expect(perPage).toBeGreaterThan(0);
  expect(perPage).toBeLessThan(200);
  const first = await page.locator('.page-indicator').textContent();
  await page.locator('.page-next').click();
  const second = await page.locator('.page-indicator').textContent();
  expect(first).not.toBe(second);
});
