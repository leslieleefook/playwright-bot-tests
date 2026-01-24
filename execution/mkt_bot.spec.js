const { test, expect } = require('@playwright/test');
const path = require('path');

const EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('MKT Bot Interaction', () => {
    test('Complete Product Idea Flow', async ({ page }) => {
        console.log('Navigating to MKT Bot...');
        await page.goto('https://bot.incusservices.com/mkt');

        // Wait for bot to initialize and show the "Yes!" button
        const startBtn = page.getByRole('button', { name: 'Yes!' });
        await startBtn.waitFor({ state: 'visible', timeout: 20000 });
        console.log('Initiating flow...');
        await startBtn.click();

        // 1. Name Input
        console.log('Providing Name...');
        const nameInput = page.locator('input.text-input, input[placeholder*="name"]').first();
        await nameInput.waitFor({ state: 'visible', timeout: 10000 });
        await nameInput.fill('Leslie');
        await page.keyboard.press('Enter');

        // 2. Email Input (Always use the specific email)
        console.log('Providing Email...');
        const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        await emailInput.fill(EMAIL);
        await page.keyboard.press('Enter');

        // 3. Product Idea
        console.log('Providing Product Idea...');
        const ideaInput = page.locator('input.text-input, textarea, input[placeholder*="idea"]').first();
        await ideaInput.waitFor({ state: 'visible', timeout: 10000 });
        await ideaInput.fill('Automated AI testing framework for conversion bots');
        await page.keyboard.press('Enter');

        // Verify Completion
        console.log('Verifying completion...');
        const successMessage = page.locator('text=/Congratulations/i').or(page.locator('text=/Your idea is being worked on/i')).first();
        await expect(successMessage).toBeVisible({ timeout: 45000 });
        console.log('MKT Bot flow completed successfully.');
    });
});
