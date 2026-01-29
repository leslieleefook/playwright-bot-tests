const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
    testDir: './tests',
    // Global timeout - increased to accommodate slow CI environments
    timeout: 360 * 1000, // 6 minutes per test
    
    // Expect timeout for assertions
    expect: {
        timeout: 30000
    },
    
    // Run tests in parallel (false for more stability during debugging)
    fullyParallel: false,
    
    // Retry flaky tests
    // CI: 2 retries (total 3 attempts)
    // Local: 0 retries (fail fast for debugging)
    retries: process.env.CI ? 2 : 0,
    
    // Reporter configuration
    // CI: blob report (for merging shards)
    // Local: list + HTML report
    reporter: process.env.CI ? 
        [
            ['blob'],
            ['json', { outputFile: 'test-results/results.json' }],
            ['list']
        ] : 
        [
            ['list'],
            ['html']
        ],
    
    // Worker configuration for better resource utilization
    workers: process.env.CI ? 2 : 1,
    
    use: {
        // Action timeout - time to wait for actions like click/fill
        actionTimeout: 45000,  // 45 seconds for CI environments
        
        // Navigation timeout - time to wait for page loads
        navigationTimeout: 90000,  // 90 seconds for slow redirects
        
        // Keep traces for failed tests (helpful for debugging)
        trace: 'retain-on-failure',
        
        // Screenshot strategy
        screenshot: 'only-on-failure',
        
        // Video recording for failed tests
        video: 'retain-on-failure',
        
        // Run headless (set false for local debugging)
        headless: true,
        
        // Viewport size
        viewport: { width: 1280, height: 720 },
        
        // Ignore HTTPS errors (for self-signed certs in dev)
        ignoreHTTPSErrors: false,
        
        // User agent
        userAgent: 'Playwright E2E Test Bot',
    },
    
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    
    // Metadata for test organization
    metadata: {
        testEnvironment: process.env.CI ? 'CI' : 'Local',
        testDate: new Date().toISOString(),
    },
});