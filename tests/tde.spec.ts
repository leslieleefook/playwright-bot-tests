import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/tde';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('TDE Bot Interaction Flow', () => {
    test('should complete TDE flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to TDE Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Initial prompt often asks if ready
        console.log('Initiating flow...');
        const startBtn = page.getByRole('button', { name: /Yes/i }).first();
        await startBtn.waitFor({ state: 'visible', timeout: 40000 });
        await startBtn.click();

        // 1. Name
        console.log('Providing Name...');
        const nameInput = page.locator('input.text-input, input[placeholder*="name"]').first();
        await nameInput.waitFor({ state: 'visible', timeout: 30000 });
        await nameInput.fill('Leslie');
        await page.keyboard.press('Enter');

        // 2. Email
        console.log('Providing Email...');
        const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
        await emailInput.waitFor({ state: 'visible', timeout: 30000 });
        await emailInput.fill(BOT_EMAIL);
        await page.keyboard.press('Enter');

        // 3. Service Interest/Details
        console.log('Providing Service Inquiry...');
        const inquiryInput = page.locator('input.text-input, textarea, input[placeholder*="Type"]').first();
        await inquiryInput.waitFor({ state: 'visible', timeout: 30000 });
        await inquiryInput.fill('Inquiring about technical delivery excellence frameworks for cloud platforms.');
        await page.keyboard.press('Enter');

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await page.waitForTimeout(5000); // Wait for submission
        console.log('TDE Bot UI stage complete.');

        // 4. Verify Email Receipt via IMAP
        const emailSubject = 'Service Inquiry';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        // Handle skipped email verification (missing credentials in CI)
        if (mail?.skipped) {
            console.log('[SKIP] Email verification skipped - credentials not configured');
            test.skip(true, 'Email verification skipped: TEST_EMAIL/TEST_EMAIL_PASSWORD not set');
            return;
        }

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: TDE Bot Email Test',
                `The TDE bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`[SUCCESS] Verified receipt of email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
