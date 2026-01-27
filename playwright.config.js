const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
    testDir: './tests',
    timeout: 360 * 1000, // 6 minutes per test for CI
    expect: {
        timeout: 30000  // Increased for CI
    },
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'blob' : [['list'], ['html']],
    use: {
        actionTimeout: 45000,  // Increased for CI environments
        navigationTimeout: 90000,  // Increased for slow redirects
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        headless: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        }
    ],
});