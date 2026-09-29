const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8137');
  
  await page.waitForTimeout(2000);
  
  const innerHTML = await page.evaluate(() => {
    const modal = document.getElementById('psychSymptomsModal');
    if (modal) {
        modal.showModal();
        if (typeof renderPsychSymptoms === 'function') {
            renderPsychSymptoms('cog');
            if (typeof hidePsychFrequency === 'function') hidePsychFrequency();
        }
        return document.getElementById('psychSymptomsGrid').innerHTML;
    }
    return 'Modal not found';
  });
  console.log('Grid HTML:', innerHTML);
  await browser.close();
})();
