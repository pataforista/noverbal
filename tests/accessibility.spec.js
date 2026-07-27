import { test, expect } from '@playwright/test';

/**
 * Regressions from the 2026-07-25 accessibility / design / usability review
 * (see docs/revision-2026-07-25.md). Each test pins a defect that was measured
 * on the running app, so it cannot silently come back.
 */

async function boot(page) {
  await page.goto('/index.html', { waitUntil: 'networkidle' });
  const save = page.locator('#btnSaveIntro');
  if (await save.isVisible().catch(() => false)) await save.click();
  await page.waitForTimeout(300);
}

// WCAG contrast helpers.
function relLuminance([r, g, b]) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(fg, bg) {
  const a = relLuminance(fg);
  const b = relLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function parseRGB(css) {
  const m = css.match(/[\d.]+/g);
  return m ? m.slice(0, 3).map(Number) : null;
}

test.describe('espacio en pantalla', () => {
  // Before the review the board began at y=853 on a 390x844 phone — below the
  // fold, so a user saw zero words without scrolling.
  test('el tablero es visible sin desplazar en un móvil vertical', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await boot(page);
    const visible = await page.evaluate(() => {
      const vh = window.innerHeight;
      return [...document.querySelectorAll('#grid .tile')]
        .filter((t) => { const b = t.getBoundingClientRect(); return b.top < vh && b.bottom > 0; }).length;
    });
    expect(visible).toBeGreaterThanOrEqual(4);
  });

  // 844x390 — a phone in landscape, or a tablet on a wheelchair mount. This was
  // the worst case: the board started at y=754, nearly two screens down.
  test('el tablero es visible sin desplazar en horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await boot(page);
    const gridTop = await page.evaluate(
      () => document.querySelector('#grid').getBoundingClientRect().top / window.innerHeight);
    expect(gridTop).toBeLessThan(0.9);
  });
});

test.describe('permanencia en pantalla', () => {
  // The core row is only "core" if it is reachable from anywhere. Nothing was
  // sticky, so the sentence, «Hablar Frase» and the core row all scrolled away.
  test('frase, «Hablar Frase» y núcleo siguen visibles tras desplazar', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(300);
    const onScreen = await page.evaluate(() => {
      const vis = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return false;
        const b = e.getBoundingClientRect();
        return b.bottom > 0 && b.top < window.innerHeight;
      };
      return { composer: vis('.composer'), speak: vis('#btnSpeak'), core: vis('.core-row'), sos: vis('#btnSOS') };
    });
    expect(onScreen).toEqual({ composer: true, speak: true, core: true, sos: true });
  });
});

test.describe('acceso por teclado y conmutador', () => {
  // Roving tabindex without arrow-key handling left 16 of 17 categories
  // unreachable by keyboard (WCAG 2.1.1).
  test('las flechas recorren todas las pestañas de categoría', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => document.querySelector('#categoryBar [role="tab"]').focus());
    const first = await page.evaluate(() => document.activeElement.textContent.trim());
    await page.keyboard.press('ArrowRight');
    const second = await page.evaluate(() => document.activeElement.textContent.trim());
    expect(second).not.toBe(first);

    await page.keyboard.press('End');
    const last = await page.evaluate(() => document.activeElement.textContent.trim());
    expect(last).not.toBe(second);

    await page.keyboard.press('Home');
    expect(await page.evaluate(() => document.activeElement.textContent.trim())).toBe(first);
  });

  // Scanning swept #grid only: a switch user could build a sentence but never
  // reach the button that speaks it.
  test('el barrido recorre frase, núcleo y tablero', async ({ page }) => {
    await boot(page);
    await page.locator('#coreRow .tile').first().click();
    await page.evaluate(() => {
      const sp = document.getElementById('scanSpeed');
      sp.value = 1;
      sp.dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById('scanningEnabled').click();
    });
    const regions = await page.evaluate(async () => {
      const seen = new Set();
      for (let i = 0; i < 40; i++) {
        document.querySelectorAll('.scanning-group').forEach((e) => {
          seen.add(e.classList.contains('composer') ? 'composer' : e.id);
        });
        await new Promise((r) => setTimeout(r, 100));
      }
      return [...seen];
    });
    expect(regions).toContain('composer');
    expect(regions).toContain('coreRow');
    expect(regions).toContain('grid');
  });

  test('el barrido puede entrar en la frase y llegar a «Hablar Frase»', async ({ page }) => {
    await boot(page);
    await page.locator('#coreRow .tile').first().click();
    await page.evaluate(() => {
      const sp = document.getElementById('scanSpeed');
      sp.value = 1;
      sp.dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById('scanningEnabled').click();
    });
    // Wait for the sweep to reach the composer region, then press the switch.
    await page.waitForFunction(() => !!document.querySelector('.composer.scanning-group'), null, { timeout: 15000 });
    await page.keyboard.press('Space');
    const reached = await page.evaluate(async () => {
      const hit = new Set();
      for (let i = 0; i < 25; i++) {
        const f = document.querySelector('.composer .scanning-focus');
        if (f) hit.add(f.id);
        await new Promise((r) => setTimeout(r, 100));
      }
      return [...hit];
    });
    expect(reached).toContain('btnSpeak');
  });

  // The remove control was a <span>, so a single word could not be deleted by
  // keyboard, screen reader or switch — only "delete last" and "clear all".
  test('cada palabra de la frase se puede quitar con un botón accesible', async ({ page }) => {
    await boot(page);
    await page.locator('#grid .tile:not([data-id="nav-anchor"])').nth(1).click();
    const remove = page.locator('#chips .chip .remove').first();
    await expect(remove).toHaveAttribute('aria-label', /Quitar/);
    expect(await remove.evaluate((e) => e.tagName)).toBe('BUTTON');
    await remove.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#chips .chip')).toHaveCount(0);
  });
});

test.describe('legibilidad', () => {
  // White on #ff6b6b was 2.78:1 — the app's primary action failed WCAG AA.
  test('«Hablar Frase» cumple el contraste AA', async ({ page }) => {
    await boot(page);
    await page.locator('#grid .tile:not([data-id="nav-anchor"])').first().click();
    const { fg, bg } = await page.evaluate(() => {
      const b = document.getElementById('btnSpeak');
      const cs = getComputedStyle(b);
      return { fg: cs.color, bg: cs.backgroundColor };
    });
    expect(contrast(parseRGB(fg), parseRGB(bg))).toBeGreaterThanOrEqual(4.5);
  });

  // `.pill` had no flex-shrink, so the flex container squeezed every label to
  // ~45% and clipped it: «Social», «Salud» and «S.O.S» all showed as «S».
  test('las etiquetas de categoría no se cortan', async ({ page }) => {
    await boot(page);
    const clipped = await page.evaluate(() => [...document.querySelectorAll('#categoryBar .pill')]
      .filter((e) => e.scrollWidth > e.clientWidth + 2)
      .map((e) => e.textContent.trim()));
    expect(clipped).toEqual([]);
  });

  test('los controles cumplen el objetivo táctil de 44px en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await boot(page);
    const small = await page.evaluate(() => {
      const sel = 'button, select, .pill, .tile';
      return [...document.querySelectorAll(sel)]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          if (!b.width || !b.height) return false;
          if (cs.visibility === 'hidden' || cs.display === 'none') return false;
          if (e.closest('dialog:not([open])')) return false;
          if (e.closest('#chips')) return false; // the small ✕ sits on a large chip
          return b.width < 44 || b.height < 44;
        })
        .map((e) => `${e.id || e.className}`.slice(0, 40));
    });
    expect(small).toEqual([]);
  });
});

test.describe('estructura y semántica', () => {
  // The main view had no headings at all — screen reader users had no outline.
  test('la vista principal tiene h1 y encabezados de región', async ({ page }) => {
    await boot(page);
    expect(await page.locator('main h1').count()).toBe(1);
    expect(await page.locator('main h2').count()).toBeGreaterThanOrEqual(2);
  });

  test('la fila de núcleo conserva su encabezado al repintarse', async ({ page }) => {
    await boot(page);
    await page.locator('#grid .tile:not([data-id="nav-anchor"])').first().click();
    await expect(page.locator('#coreHeading')).toHaveCount(1);
  });
});

test.describe('compositor', () => {
  // Pausa/Detener sat permanently beside the primary action, and Detener only
  // cancelled TTS — it did nothing for the 46 pre-recorded high-frequency words.
  test('los controles de reproducción sólo aparecen al hablar', async ({ page }) => {
    await boot(page);
    await expect(page.locator('.speech-controls')).toBeHidden();
  });

  test('las acciones de frase están desactivadas con la frase vacía', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#btnSpeak')).toBeDisabled();
    await expect(page.locator('#btnClear')).toBeDisabled();
    await page.locator('#grid .tile:not([data-id="nav-anchor"])').first().click();
    await expect(page.locator('#btnSpeak')).toBeEnabled();
  });

  // A text-only sentence strip is unreadable to a user who does not read.
  test('la barra de frase muestra el pictograma de cada palabra', async ({ page }) => {
    await boot(page);
    await page.locator('#grid .tile:not([data-id="nav-anchor"])').nth(1).click();
    await expect(page.locator('#chips .chip .chip-img')).toHaveCount(1);
  });
});

test.describe('editor', () => {
  // `.file-input-wrapper` had no CSS, so the raw «Choose File» control rendered
  // next to the styled «Subir Archivo» button.
  test('el input de archivo nativo no se muestra junto al botón', async ({ page }) => {
    await boot(page);
    await page.locator('#btnEdit').click();
    await page.locator('.hub-menu-row[data-hub-target="screen-add-item"]').click();
    await expect(page.locator('.file-input-wrapper label')).toBeVisible();
    const native = await page.locator('#itemImage').evaluate((e) => {
      const b = e.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height), opacity: getComputedStyle(e).opacity };
    });
    expect(native.opacity).toBe('0');
    expect(native.w).toBeLessThanOrEqual(2);
    expect(native.h).toBeLessThanOrEqual(2);
  });
});
