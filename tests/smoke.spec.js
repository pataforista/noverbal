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

test('SOS button jumps to the emergency profile (N-5)', async ({ page }) => {
  await page.locator('#btnSOS').click();
  await expect(page.locator('#headerProfile')).toHaveValue('sos');
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

test('backup export produces a versioned, importable JSON file (device transfer)', async ({ page }) => {
  await page.locator('#btnEdit').click();
  await expect(page.locator('#editModal')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#btnExport').click(),
  ]);
  const path = await download.path();
  const fs = await import('node:fs/promises');
  const payload = JSON.parse(await fs.readFile(path, 'utf-8'));

  expect(payload.format).toBe('holaac-backup');
  expect(typeof payload.schemaVersion).toBe('number');
  expect(Array.isArray(payload.items)).toBe(true);
  expect(payload.items.length).toBeGreaterThan(50);

  // Round-trip: importing the file just downloaded should be accepted without error.
  page.once('dialog', (d) => d.accept());
  await page.setInputFiles('#importFile', path);
  await expect(page.locator('#statusText')).toHaveText(/Importaci(o|ó)n completada/);
  expect(page.errors, page.errors.join('\n')).toHaveLength(0);
});

test('vocabulary levels hide/show a whole saved set with one tap (progressive vocabulary)', async ({ page }) => {
  const target = page.locator('#grid .tile:not([data-id="nav-anchor"])').first();
  const targetId = await target.getAttribute('data-id');

  // Seed a saved level that hides this one item and mark it active, as if a
  // tutor had already hidden it via Tutor Mode and saved the set with a name.
  await page.evaluate((id) => {
    localStorage.setItem('aac_vocab_levels_v1', JSON.stringify([
      { id: 'lvl-test', name: 'Nivel de prueba', hiddenIds: [id] },
    ]));
    localStorage.setItem('aac_active_vocab_level_v1', 'lvl-test');
    localStorage.setItem('aac_hidden_tags_v2', JSON.stringify([id]));
  }, targetId);

  await page.reload({ waitUntil: 'networkidle' });
  await dismissIntro(page);

  await expect(page.locator(`#grid .tile[data-id="${targetId}"]`)).toHaveCount(0);

  await page.locator('#btnSettings').click();
  await expect(page.locator('#vocabLevelSelect')).toHaveValue('lvl-test');

  await page.selectOption('#vocabLevelSelect', '');
  await page.locator('#btnApplyVocabLevel').click();
  await expect(page.locator(`#grid .tile[data-id="${targetId}"]`)).toHaveCount(1);
  expect(page.errors, page.errors.join('\n')).toHaveLength(0);
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
