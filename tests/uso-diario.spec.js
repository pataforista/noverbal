import { test, expect, devices } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';

// Daily-use flows on a phone: what a family does on day two, not just day one.
test.use({ ...devices['Pixel 5'] });

// Tema/Ajustes/Editar/Consulta viven dentro de «Más»; los modos, en «Modos».
async function clickHeaderTool(page, selector) {
  const target = page.locator(selector);
  if (!(await target.isVisible())) {
    const inModes = await target.evaluate((e) => !!e.closest('#modesMenu'));
    await page.locator(inModes ? '#btnModesToggle' : '#btnMore').click();
  }
  await target.click();
}

async function boot(page) {
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  const save = page.locator('#btnSaveIntro');
  if (await save.isVisible().catch(() => false)) await save.click();
  await expect(page.locator('#statusText')).toHaveText(/Listo/);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

// A noisy 1600×1200 PNG: incompressible, so it weighs what a phone photo does.
function bigPhoto() {
  const w = 1600, h = 1200;
  const raw = crypto.randomBytes((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 1 })), chunk('IEND', Buffer.alloc(0)),
  ]);
  const file = path.join(os.tmpdir(), `holaac-foto-${process.pid}.png`);
  fs.writeFileSync(file, png);
  return file;
}

async function createWord(page, text, category, image) {
  await clickHeaderTool(page, '#btnEdit');
  await page.locator('#cardCreateWord').click();
  await page.locator('#itemText').fill(text);
  await page.locator('#itemCategory').fill(category);
  await page.locator('#btnWizardNext1').click();
  if (image) {
    await page.locator('#itemImage').setInputFiles(image);
    await expect(page.locator('#preview img')).toHaveCount(1);
  }
  await page.locator('#btnWizardNext2').click();
  await page.locator('#btnAddItem').click();
  await expect(page.locator('#statusText')).toContainText('añadida');
  await page.locator('[data-close-dialog="editModal"]').first().click();
}

test('una palabra en una categoría nueva aparece en el tablero y sigue tras recargar', async ({ page }) => {
  await boot(page);
  await createWord(page, 'Abuela Rosa', 'Familia');
  await page.locator('#searchBox').fill('Rosa');
  await expect(page.locator('#grid .tile', { hasText: 'Abuela Rosa' })).toHaveCount(1);
  await expect(page.locator('#categoryBar .pill', { hasText: 'Familia' })).toHaveCount(1);

  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#searchBox').fill('Rosa');
  await expect(page.locator('#grid .tile', { hasText: 'Abuela Rosa' })).toHaveCount(1);
});

test('una foto grande se reduce y el respaldo con fotos se puede restaurar', async ({ page }) => {
  test.setTimeout(60_000);
  const photo = bigPhoto();
  expect(fs.statSync(photo).size).toBeGreaterThan(3 * 1024 * 1024);
  await boot(page);
  await createWord(page, 'Mi perro', 'Familia', photo);
  fs.rmSync(photo);

  await page.locator('#searchBox').fill('perro');
  const src = await page.locator('#grid .tile', { hasText: 'Mi perro' }).locator('img').getAttribute('src');
  expect(src.length).toBeLessThan(1024 * 1024);
  const side = await page.evaluate((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(Math.max(i.naturalWidth, i.naturalHeight)); i.src = s; }), src);
  expect(side).toBeLessThanOrEqual(512);

  await clickHeaderTool(page, '#btnEdit');
  await page.locator('#editorLibraryDetails summary').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#btnExport').click()]);
  const backup = await download.path();

  // Simula un teléfono nuevo: sin datos locales.
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise((r) => { const q = indexedDB.deleteDatabase('MiTableroAAC_DB'); q.onsuccess = q.onerror = q.onblocked = r; });
  });
  await boot(page);
  await page.locator('#searchBox').fill('perro');
  await expect(page.locator('#grid .tile', { hasText: 'Mi perro' })).toHaveCount(0);

  await clickHeaderTool(page, '#btnEdit');
  await page.locator('#editorLibraryDetails summary').click();
  await page.locator('#importFile').setInputFiles(backup);
  await page.locator('#btnConfirmOk').click();
  await expect(page.locator('#statusText')).toHaveText(/Importación completada/);
  await page.locator('[data-close-dialog="editModal"]').first().click();
  await page.locator('#searchBox').fill('perro');
  await expect(page.locator('#grid .tile', { hasText: 'Mi perro' })).toHaveCount(1);
});

test('cambiar de lugar desde una categoría ajena vuelve a «Todas»', async ({ page }) => {
  await boot(page);
  await page.locator('#categoryBar .pill', { hasText: 'C. Médica' }).click();
  await expect(page.locator('.breadcrumb-label')).not.toHaveText('Todas las palabras');
  await page.locator('#headerProfile').selectOption('home');
  await expect(page.locator('.breadcrumb-label')).toHaveText('Todas las palabras');
  expect(await page.locator('#grid .tile').count()).toBeGreaterThan(50);
});

test('la app abre y muestra el tablero sin conexión', async ({ page, context }) => {
  await boot(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' }); // ahora la página la controla el SW
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#grid .tile').nth(10)).toBeVisible();
  await expect(page.locator('#coreRow .tile').first()).toBeVisible();
});
