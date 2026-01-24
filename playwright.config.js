const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
    testDir: './tests',
    timeout: 300 * 1000,
    expect: {
        timeout: 20000
    },
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: [['list'], ['html']],
    use: {
        actionTimeout: 10000,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        headless: true,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'airoi',
            use: { ...devices['Desktop Chrome'] },
        }
    ],
});
