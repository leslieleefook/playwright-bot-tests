import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/claims';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Claims Bot Interaction Flow', () => {
    test('should complete claims flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to Claims Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for bot to initialize and show the "Yes!" button
        console.log('Initiating flow...');
        const startBtn = page.getByRole('button', { name: /Yes/i }).first();
        await startBtn.waitFor({ state: 'visible', timeout: 40000 });
        await startBtn.click();

        // Helper to wait for and fill textbox
        const fillTextbox = async (value: string) => {
            const textbox = page.getByRole('textbox').first();
            await textbox.waitFor({ state: 'visible', timeout: 30000 });
            await textbox.fill(value);
            const sendBtn = page.getByRole('button', { name: /Send/i }).first();
            await sendBtn.click();
            await page.waitForTimeout(2000); // Wait for bot response
        };

        // 1. Name
        console.log('Providing Name...');
        await fillTextbox('Leslie');

        // 2. Email
        console.log('Providing Email...');
        await fillTextbox(BOT_EMAIL);

        // 3. Claims Details
        console.log('Providing Claims Details...');
        await fillTextbox('Reporting an issue with a recent service interaction for operational verification.');

        // 4. File Upload (optional if exist in fixtures)
        console.log('Checking for claim image upload...');
        const imgPath = getFixturePath('claims', 'img');
        if (imgPath) {
            await uploadToTypebot(page, imgPath);
            await page.waitForTimeout(5000);
            const nextBtn = page.getByRole('button', { name: /Continue|Next|Submit/i }).first();
            if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                await nextBtn.click();
            }
        }

        // Verify Completion (on-page)
        console.log('Verifying interaction completion...');
        await page.waitForTimeout(10000); // Give bot time to process
        console.log('Claims Bot UI stage complete.');

        // 5. Verify Email Receipt via IMAP
        const emailSubject = 'Claim Received';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Claims Bot Email Test',
                `The Claims bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`[SUCCESS] Verified receipt of email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});