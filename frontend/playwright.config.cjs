/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: 'tests/playwright',
  timeout: 30000,
  use: {
    headless: true,
    baseURL: 'http://localhost:5173',
    actionTimeout: 5000,
    navigationTimeout: 30000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // more CI-friendly settings
  retries: 1,
  reporter: [ ['dot'], ['html', { outputFolder: 'test-results/playwright-report' }] ],
  // adjust artifacts
  outputDir: 'test-results/playwright-artifacts',
  projects: [
    { name: 'Chromium', use: { browserName: 'chromium' } },
  ],
};
