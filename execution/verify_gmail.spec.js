const { test, expect } = require('@playwright/test');
const path = require('path');

const STORAGE_STATE = path.join(__dirname, '..', '.tmp', 'storageState.json');
const EMAIL = 'accesssmartwriter3@gmail.com';
const FAILURE_RECIPIENT = 'leslieleefook@incusservices.com';

test.use({
    storageState: STORAGE_STATE,
});

test.describe('Gmail Verification (Persistent Session)', () => {
    test('Verify Gmail Inbox Access', async ({ page }) => {
        console.log('Checking Gmail access using persistent session...');

        // Go to Gmail
        await page.goto('https://mail.google.com/mail/u/0/#inbox');

        // Check if we are logged in or redirected to login
        if (page.url().includes('accounts.google.com')) {
            console.error('NOT LOGGED IN. User session not found or expired.');
            throw new Error('Please run setup_session.js and log in manually first.');
        }

        // Verify Inbox Load
        try {
            await page.waitForSelector('div[role="main"]', { timeout: 20000 });
            console.log('Successfully accessed Gmail inbox.');
        } catch (e) {
            await page.screenshot({ path: '.tmp/inbox_error.png' });
            console.error('Failed to find inbox main div. Check screenshot.');
            throw new Error('Failed to verify Gmail inbox content.');
        }

        // Ensure title contains Inbox
        await expect(page).toHaveTitle(/Inbox/);
        console.log('Gmail verification complete.');
    });
});
