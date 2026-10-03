import { test, expect } from '@playwright/test';

// Modo Consulta y Explorador de Síntomas, más los arreglos de diseño que
// llegaron con la revisión de 2026-10: cada test fija un defecto medido en la
// app real para que no vuelva en silencio.

test.use({ storageState: { cookies: [], origins: [] } });

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.errors = errors;
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  const save = page.locator('#btnSaveIntro');
  if (await save.isVisible().catch(() => false)) await save.click();
  await expect(page.locator('#statusText')).toHaveText(/Listo/);
}

async function openPsychExplorer(page) {
  // El panel de consulta pide PIN al abrirse desde el header; aquí se abre
  // directo para probar solo el explorador.
  await page.evaluate(() => document.getElementById('consultaModal').showModal());
  await page.locator('#btnConsultaPsychSymptoms').click();
  await expect(page.locator('#psychSymptomsModal')).toHaveJSProperty('open', true);
}

test.describe('explorador de síntomas', () => {
  test.beforeEach(async ({ page }) => {
    await boot(page);
  });

  test('elegir un síntoma reemplaza la rejilla por la escala de intensidad', async ({ page }) => {
    await openPsychExplorer(page);
    const grid = page.locator('#psychSymptomsGrid');
    await expect(grid.locator('.psych-symptom-card')).toHaveCount(8);
    await grid.locator('.psych-symptom-card').first().click();
    await expect(grid).toBeHidden();
    await expect(page.locator('#psychFreqPanel')).toBeVisible();
    await expect(page.locator('#psychFreqPrompt')).toContainText('¿Cuánto sientes');
    // Cada opción lleva su cara para quien no lee.
    await expect(page.locator('.psych-freq-btn img.psych-freq-face')).toHaveCount(3);

    await page.locator('#btnPsychFreqCancel').click();
    await expect(grid).toBeVisible();
    await expect(page.locator('#psychFreqPanel')).toBeHidden();
  });

  test('reportar una intensidad cierra el explorador sin errores', async ({ page }) => {
    await openPsychExplorer(page);
    await page.locator('.psych-tab[data-dim="aff"]').click();
    await expect(page.locator('.psych-tab[data-dim="aff"]')).toHaveAttribute('aria-selected', 'true');
    await page.locator('.psych-symptom-card', { hasText: 'Ansiedad' }).click();
    await page.locator('.psych-freq-btn.freq-2').click();
    await expect(page.locator('#psychSymptomsModal')).toHaveJSProperty('open', false);
    await expect(page.locator('#statusToastText')).toContainText('Ansiedad');
    expect(page.errors, page.errors.join('\n')).toHaveLength(0);
  });

  test('las pestañas se recorren con las flechas', async ({ page }) => {
    await openPsychExplorer(page);
    await page.locator('.psych-tab[data-dim="cog"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.psych-tab[data-dim="aff"]')).toBeFocused();
    await expect(page.locator('.psych-tab[data-dim="aff"]')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.psych-tab[data-dim="som"]')).toBeFocused();
  });

  test('las tarjetas de síntoma son botones reales', async ({ page }) => {
    await openPsychExplorer(page);
    const tags = await page.locator('.psych-symptom-card').evaluateAll((els) => els.map((e) => e.tagName));
    expect(new Set(tags)).toEqual(new Set(['BUTTON']));
  });
});

test.describe('revisión visual 2026-10', () => {
  test('ningún texto del tablero trae acentos rotos (U+FFFD)', async ({ page }) => {
    await boot(page);
    const broken = await page.locator('#grid .tile .tile-text').evaluateAll(
      (els) => els.map((e) => e.textContent).filter((t) => t.includes('�')),
    );
    expect(broken).toEqual([]);
  });

  test('«Todas» empieza por vocabulario, no por las escalas de dolor y ánimo', async ({ page }) => {
    await boot(page);
    const first = await page.locator('#grid .tile:not(.tile-nav)').first().getAttribute('data-id');
    expect(first).not.toMatch(/^(pain|mood)-/);
  });

  test('el encabezado cabe en una fila en un portátil de 1366px', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await boot(page);
    const h = await page.locator('.topbar').evaluate((e) => e.offsetHeight);
    expect(h).toBeLessThan(80);
  });

  test('«Inicio» se lee en tema oscuro', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await boot(page);
    await page.evaluate(() => document.body.classList.add('dark-theme'));
    const [fg, bg] = await page.locator('.tile-nav').evaluate((tile) => {
      const rgb = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      return [rgb(getComputedStyle(tile.querySelector('.tile-text')).color), rgb(getComputedStyle(tile).backgroundColor)];
    });
    const lum = ([r, g, b]) => [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
    const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    expect((l1 + 0.05) / (l2 + 0.05)).toBeGreaterThan(4.5);
  });
});
