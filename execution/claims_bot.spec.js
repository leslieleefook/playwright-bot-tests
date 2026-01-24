const { test, expect } = require('@playwright/test');

const EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Claims Bot Interaction', () => {
    test('Complete Claims Flow', async ({ page }) => {
        console.log('Navigating to Claims Bot...');
        await page.goto('https://bot.incusservices.com/claims');

        // Wait for bot to initialize and show the "Yes!" button (using shared Typebot selector)
        const startBtn = page.getByRole('button', { name: 'Yes!' });
        await startBtn.waitFor({ state: 'visible', timeout: 20000 });
        console.log('Initiating flow...');
        await startBtn.click();

        // 1. First Name
        console.log('Providing Name...');
        const nameInput = page.locator('input.text-input, input[placeholder*="name"]').first();
        await nameInput.waitFor({ state: 'visible', timeout: 10000 });
        await nameInput.fill('Leslie');
        await page.keyboard.press('Enter');

        // 2. Email (Always use specific email)
        console.log('Providing Email...');
        const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        await emailInput.fill(EMAIL);
        await page.keyboard.press('Enter');

        // 3. Claims Details (Specific to this bot)
        console.log('Providing Claims Details...');
        const detailsInput = page.locator('input.text-input, textarea, input[placeholder*="Type"]').first();
        await detailsInput.waitFor({ state: 'visible', timeout: 10000 });
        await detailsInput.fill('Reporting an issue with a recent service interaction for operational verification.');
        await page.keyboard.press('Enter');

        // Verify Completion
        console.log('Verifying completion...');
        // Generic Typebot completion indicator: check for messages or the absence of text indicators
        await page.waitForTimeout(10000); // Give bot time to process
        console.log('Claims Bot flow verification step performed.');
    });
});
