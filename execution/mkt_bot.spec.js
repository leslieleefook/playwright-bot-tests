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

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        const successMessage = page.locator('text=/Congratulations/i').or(page.locator('text=/Your idea is being worked on/i')).first();
        await expect(successMessage).toBeVisible({ timeout: 45000 });
        console.log('MKT Bot UI success confirmed.');

        // 4. Verify Email Receipt via IMAP
        console.log('Retrieving confirmation email via IMAP...');
        const { waitForEmailConfirmation } = require('./email_imap_util');
        const imapConfig = {
            user: process.env.IMAP_USER || '1677006355115_38182701@zohomail.com',
            password: process.env.IMAP_PASSWORD,
            host: process.env.IMAP_HOST || 'imap.zoho.com',
            port: parseInt(process.env.IMAP_PORT || '993', 10),
            tls: true,
            authTimeout: 3000
        };

        const mail = await waitForEmailConfirmation(imapConfig, 'Product Idea Flow'); // Adjust subject as needed
        expect(mail).toBeTruthy();
        console.log('MKT Bot email success confirmed.');
    });
});
