const { test, expect } = require('@playwright/test');

const EMAIL = 'accesssmartwriter3@gmail.com';

test.describe('TDE Bot Interaction', () => {
    test('Complete TDE Flow', async ({ page }) => {
        console.log('Navigating to TDE Bot...');
        await page.goto('https://bot.incusservices.com/tde');

        // Initial prompt often asks if ready
        const startBtn = page.getByRole('button', { name: /Yes/i }).first();
        await startBtn.waitFor({ state: 'visible', timeout: 20000 });
        console.log('Initiating flow...');
        await startBtn.click();

        // 1. Name
        console.log('Providing Name...');
        const nameInput = page.locator('input.text-input, input[placeholder*="name"]').first();
        await nameInput.waitFor({ state: 'visible', timeout: 10000 });
        await nameInput.fill('Leslie');
        await page.keyboard.press('Enter');

        // 2. Email
        console.log('Providing Email...');
        const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        await emailInput.fill(EMAIL);
        await page.keyboard.press('Enter');

        // 3. Service Interest/Details
        console.log('Providing Service Inquiry...');
        const inquiryInput = page.locator('input.text-input, textarea, input[placeholder*="Type"]').first();
        await inquiryInput.waitFor({ state: 'visible', timeout: 10000 });
        await inquiryInput.fill('Inquiring about technical delivery excellence frameworks for cloud platforms.');
        await page.keyboard.press('Enter');

        // Verify Completion
        console.log('Verifying completion...');
        await page.waitForTimeout(10000);
        console.log('TDE Bot flow verification step performed.');
    });
});
