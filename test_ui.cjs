const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8137');
  
  // Wait for the app to load
  await page.waitForTimeout(2000);
  
  // Open the psych modal directly using its exposed button or via script
  await page.evaluate(() => {
    const modal = document.getElementById('psychSymptomsModal');
    if (modal) {
        // init might not have run if in a different state, but the modal is in the DOM
        modal.showModal();
        // Trigger render
        if (typeof renderPsychSymptoms === 'function') {
            renderPsychSymptoms('cog');
        }
    }
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'psych_modal.png' });
  
  // Click a symptom to show the frequency panel
  await page.evaluate(() => {
    const card = document.querySelector('.psych-symptom-card');
    if (card) card.click();
  });
  
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'psych_freq.png' });
  
  await browser.close();
  console.log('Screenshots taken');
})();
