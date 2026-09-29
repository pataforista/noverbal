const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8137');
  
  await page.waitForTimeout(2000);
  
  // Click the PIN to unlock if needed? Wait, consultaModal requires PIN?
  // Let's bypass PIN or simulate it. 
  // In HolAAC, PIN is stored in localStorage. We can just set it or bypass it.
  // Actually, btnConsulta opens pinModal if locked. Let's just manually call modal.showModal() but trigger the event listener!
  
  await page.evaluate(() => {
    const btn = document.getElementById('btnConsultaPsychSymptoms');
    if (btn) btn.click();
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'psych_modal_real.png' });
  
  // Click a symptom to show frequency
  await page.evaluate(() => {
    const card = document.querySelector('.psych-symptom-card');
    if (card) card.click();
  });
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'psych_freq_real.png' });
  
  await browser.close();
  console.log('Screenshots taken via UI click');
})();
