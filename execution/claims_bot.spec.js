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

        // Verify Completion (on-page)
        console.log('Verifying interaction completion...');
        await page.waitForTimeout(10000); // Give bot time to process
        console.log('Claims Bot UI stage complete.');

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

        const mail = await waitForEmailConfirmation(imapConfig, 'Claim Received'); // Adjust subject as needed
        expect(mail).toBeTruthy();
        console.log('Claims Bot email success confirmed.');
    });
});
