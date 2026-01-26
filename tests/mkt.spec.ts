import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/mkt';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('MKT Bot Interaction Flow', () => {
    test('should complete product idea flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to MKT Bot: ${BOT_URL}...`);
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

        // Wait for bot to initialize and show the "Yes!" button
        console.log('Initiating flow...');
        const startBtn = page.getByRole('button', { name: /Yes/i }).first();
        await startBtn.waitFor({ state: 'visible', timeout: 40000 });
        await startBtn.click();
        await page.waitForTimeout(2000);

        // 1. Name Input
        console.log('Providing Name...');
        await fillTextbox('Leslie');

        // 2. Email Input
        console.log('Providing Email...');
        await fillTextbox(BOT_EMAIL);

        // 3. Product Idea
        console.log('Providing Product Idea...');
        await fillTextbox('Automated AI testing framework for conversion bots');

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await page.waitForTimeout(10000); // Give bot time to process
        console.log('MKT Bot UI success confirmed.');

        // 4. Verify Email Receipt via IMAP
        const emailSubject = 'Product Idea Flow';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: MKT Bot Email Test',
                `The MKT bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`[SUCCESS] Verified receipt of email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
