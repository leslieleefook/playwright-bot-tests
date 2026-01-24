const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
    testDir: './tests',
    timeout: 300 * 1000,
    expect: {
        timeout: 20000
    },
    fullyParallel: false,
    reporter: [['list'], ['html']],
    use: {
        actionTimeout: 10000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'on',
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
