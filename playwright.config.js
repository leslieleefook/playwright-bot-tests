const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './execution',
    timeout: 60 * 1000,
    expect: {
        timeout: 10000
    },
    fullyParallel: false,
    reporter: 'list',
    use: {
        actionTimeout: 0,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        headless: true, // Start with headless
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
