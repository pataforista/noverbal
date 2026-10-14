import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Auditoría WCAG 2.2 AA con axe-core sobre la vista principal y cada diálogo,
// en tema claro y oscuro, más tres criterios que axe no puede medir solo:
// etiquetas de fichas recortadas, paradas de foco invisibles y espaciado de
// texto ampliado (1.4.12). Un cambio que rompa cualquiera de ellos falla aquí.

const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The app's CSP (script-src 'self') blocks the injected axe script.
test.use({ storageState: { cookies: [], origins: [] }, bypassCSP: true });

async function boot(page) {
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  const save = page.locator('#btnSaveIntro');
  if (await save.isVisible().catch(() => false)) await save.click();
  await expect(page.locator('#statusText')).toHaveText(/Listo/);
}

async function violations(page, dialogId) {
  await page.evaluate((id) => {
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    if (id) document.getElementById(id).showModal();
  }, dialogId);
  return page.evaluate(async ([id, tags]) => {
    const r = await window.axe.run(id ? document.getElementById(id) : document,
      { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  }, [dialogId, TAGS]);
}

for (const scheme of ['light', 'dark']) {
  test(`sin infracciones WCAG 2.2 AA en ningún diálogo (tema ${scheme === 'light' ? 'claro' : 'oscuro'})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await boot(page);
    if (scheme === 'dark') await page.evaluate(() => document.body.classList.add('dark-theme'));
    await page.locator('#grid .tile:not(.tile-nav)').first().click();
    await page.addScriptTag({ content: AXE });
    const dialogs = await page.evaluate(() => [...document.querySelectorAll('dialog')].map((d) => d.id));
    const found = {};
    for (const id of [null, ...dialogs]) {
      const v = await violations(page, id);
      if (v.length) found[id || 'principal'] = v;
    }
    expect(found).toEqual({});
  });
}

test.describe('teléfono', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('ninguna etiqueta de ficha se recorta, tampoco con espaciado ampliado', async ({ page }) => {
    await boot(page);
    const cut = () => page.evaluate(() => [...document.querySelectorAll('#grid .tile-text, #coreRow .tile-text')]
      .filter((e) => e.getBoundingClientRect().width > 0
        && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1))
      .map((e) => e.textContent.trim()));
    expect(await cut()).toEqual([]);
    // WCAG 1.4.12: interlineado 1.5, letras 0.12em, palabras 0.16em.
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }' });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await cut()).not.toContain('Ganas de hacerme daño');
  });
});

test('ninguna parada de Tab cae en un control invisible', async ({ page }) => {
  await boot(page);
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const hidden = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      return +cs.opacity === 0 || cs.visibility === 'hidden' ? (e.id || e.className) : null;
    });
    expect(hidden).toBeNull();
  }
});
