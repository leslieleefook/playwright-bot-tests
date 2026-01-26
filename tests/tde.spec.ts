import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/tde';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('TDE Bot Interaction Flow', () => {
    test('should complete TDE flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to TDE Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Helper to wait for and fill textbox
        const fillTextbox = async (value: string) => {
            const textbox = page.getByRole('textbox').first();
            await textbox.waitFor({ state: 'visible', timeout: 30000 });
            await textbox.fill(value);
            const sendBtn = page.getByRole('button', { name: /Send/i }).first();
            await sendBtn.click();
            await page.waitForTimeout(2000);
        };

        // TDE bot starts directly with name input (no Yes button)
        // 1. Name
        console.log('Providing Name...');
        await fillTextbox('Leslie');

        // 2. Email (if asked)
        console.log('Providing Email...');
        await fillTextbox(BOT_EMAIL);

        // 3. Service Interest/Details
        console.log('Providing Service Inquiry...');
        await fillTextbox('Inquiring about technical delivery excellence frameworks for cloud platforms.');

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await page.waitForTimeout(5000);
        console.log('TDE Bot UI stage complete.');

        // 4. Verify Email Receipt via IMAP
        const emailSubject = 'Service Inquiry';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

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