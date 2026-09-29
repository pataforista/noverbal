const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8137');
  
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => {
    const modal = document.getElementById('psychSymptomsModal');
    if (modal) {
        modal.showModal();
        if (typeof renderPsychSymptoms === 'function') {
            renderPsychSymptoms('cog');
            if (typeof hidePsychFrequency === 'function') hidePsychFrequency();
        }
    }
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'psych_modal2.png' });
  
  await browser.close();
  console.log('Screenshot 2 taken');
})();
