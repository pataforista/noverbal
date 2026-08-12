import { defineConfig, devices } from '@playwright/test';

const PORT = 8137;

// Smoke tests run the real app against a plain static server, the same way it is
// deployed. Chromium only — that's what the CI runner installs.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'line',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    // Local runs may point at a pre-installed Chromium via PW_CHROME; CI installs
    // the matching browser so this stays undefined there.
    launchOptions: process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: process.platform === 'win32' ? `python -m http.server ${PORT}` : `python3 -m http.server ${PORT}`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
