import { test, expect } from '@playwright/test';

// Revisión de estética y navegación (2026-10-14). Cada test fija un defecto
// medido en la app real: duplicados que aparecían al volver a abrirla,
// palabras de la biblioteca sin tilde, texto invisible en tema oscuro, una
// tira de categorías que en el teléfono dejaba leer una sola píldora y un
// barrido que escondía la ficha resaltada bajo la cabecera fija. Después:
// la frase en una línea fija en el teléfono y el ajuste «Palabras básicas
// al desplazar».

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

const normalize = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function boardTexts(page) {
  return page.locator('#grid .tile:not(.tile-nav)').evaluateAll((els) => els.map((e) => e.dataset.id + '|' + e.querySelector('.tile-text')?.textContent.trim()));
}

function contrast(fg, bg) {
  const lum = ([r, g, b]) => [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }).reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

test('volver a abrir la app no duplica las palabras básicas', async ({ page }) => {
  await boot(page);
  const first = await boardTexts(page);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#statusText')).toHaveText(/Listo/);
  const second = await boardTexts(page);
  expect(second.length).toBe(first.length);
  // «Sí» y su gemela sin tilde de la biblioteca no pueden convivir.
  const yes = second.filter((t) => normalize(t.split('|')[1]) === 'si');
  expect(yes).toHaveLength(1);
});

test('las palabras de la biblioteca llevan sus tildes', async ({ page }) => {
  await boot(page);
  const texts = (await boardTexts(page)).map((t) => t.split('|')[1]);
  for (const word of ['Mamá', 'Papá', 'Más', 'Adiós', 'Música', 'Teléfono', 'Pequeño']) {
    expect(texts).toContain(word);
  }
  for (const word of ['Mama', 'Papa', 'Mas', 'Adios', 'Pequeno']) {
    expect(texts).not.toContain(word);
  }
});

test('las fichas sin color propio se leen en tema oscuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await boot(page);
  await page.evaluate(() => document.body.classList.add('dark-theme'));
  const pair = await page.locator('#grid .tile[data-id^="psych-"]').first().evaluate((tile) => {
    const rgb = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    return [rgb(getComputedStyle(tile.querySelector('.tile-text')).color), rgb(getComputedStyle(tile).backgroundColor)];
  });
  expect(contrast(...pair)).toBeGreaterThan(4.5);
});

test('el texto de los diálogos se lee en tema oscuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await boot(page);
  await page.evaluate(() => {
    document.body.classList.add('dark-theme');
    document.getElementById('pinModal').showModal();
  });
  const pair = await page.locator('#pinModal .modal-body p').evaluate((p) => {
    const rgb = (c) => c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    return [rgb(getComputedStyle(p).color), rgb(getComputedStyle(p.closest('dialog')).backgroundColor)];
  });
  expect(contrast(...pair)).toBeGreaterThan(4.5);
});

test.describe('teléfono táctil', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('la tira de categorías deja ver más de una categoría entera', async ({ page }) => {
    // Headless Chromium only reports `pointer: coarse` with touch emulation on.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await boot(page);
    await expect(page.locator('#categoryPrev')).toBeHidden();
    const visible = await page.locator('#categoryBar').evaluate((bar) => {
      const b = bar.getBoundingClientRect();
      return [...bar.querySelectorAll('[role=tab]')].filter((t) => {
        const r = t.getBoundingClientRect();
        return r.left >= b.left - 1 && r.right <= b.right + 1;
      }).length;
    });
    expect(visible).toBeGreaterThanOrEqual(2);
  });

  test('el barrido no deja la ficha resaltada bajo la cabecera fija', async ({ page }) => {
    await boot(page);
    // Lo mismo que hace highlightTile() al barrer hacia arriba: la ficha está
    // por encima de la vista y se trae con block: 'nearest'.
    const onTop = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const tile = document.querySelectorAll('#grid .tile')[20];
      tile.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      const r = tile.getBoundingClientRect();
      return tile.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    });
    expect(onTop).toBe(true);
  });
});

test.describe('espacio para el tablero en el teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // La frase ocupaba dos líneas: 140px vacía y 172px con la primera palabra,
  // así que el primer toque empujaba el tablero 32px bajo el dedo.
  test('la frase cabe en una línea y no crece con la primera palabra', async ({ page }) => {
    await boot(page);
    const height = () => page.locator('.composer').evaluate((e) => e.getBoundingClientRect().height);
    const empty = await height();
    await page.locator('#grid .tile:not(.tile-nav)').first().click();
    await expect(page.locator('#chips .chip')).toHaveCount(1);
    expect(await height()).toBe(empty);
    expect(empty).toBeLessThanOrEqual(120);
    // Borrar, Limpiar y Hablar Frase en la misma línea que la frase.
    const tops = await page.evaluate(() => ['#chips', '#btnBackspace', '#btnSpeak']
      .map((s) => Math.round(document.querySelector(s).getBoundingClientRect().top / 10)));
    expect(new Set(tops).size).toBe(1);
    // Mientras habla aparecen Pausa y Detener en otra columna, sin pisar la frase.
    await page.evaluate(() => document.body.classList.add('is-speaking'));
    const [chipsRight, pauseLeft] = await page.evaluate(() => [
      document.querySelector('#chips').getBoundingClientRect().right,
      document.querySelector('#btnPause').getBoundingClientRect().left,
    ]);
    expect(pauseLeft).toBeGreaterThanOrEqual(chipsRight);
  });

  async function setCorePin(page, mode) {
    await page.locator('#btnMore').click();
    await page.locator('#btnSettings').click();
    await page.locator('#coreRowPin').selectOption(mode);
    await page.keyboard.press('Escape');
  }

  const corePosition = (page) => page.locator('.core-row').evaluate((e) => getComputedStyle(e).position);

  test('«Automático» suelta las palabras básicas en un teléfono bajo', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await boot(page);
    expect(await corePosition(page)).toBe('static');
    await setCorePin(page, 'always');
    expect(await corePosition(page)).toBe('sticky');
  });

  test('«Automático» las mantiene fijas en un teléfono alto', async ({ page }) => {
    await boot(page);
    expect(await corePosition(page)).toBe('sticky');
  });

  test('«Se desplazan con el tablero» se aplica y se recuerda', async ({ page }) => {
    await boot(page);
    await setCorePin(page, 'never');
    expect(await corePosition(page)).toBe('static');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#statusText')).toHaveText(/Listo/);
    expect(await corePosition(page)).toBe('static');
    await expect(page.locator('#coreRowPin')).toHaveValue('never');
  });
});
