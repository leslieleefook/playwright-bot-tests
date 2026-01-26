import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/compliance';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Compliance Bot Interaction Flow', () => {
    test('should trigger compliance email and verify multi-file receipt', async ({ page }) => {
        console.log(`Navigating to Compliance Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Start
        console.log('Initiating flow...');
        const startBtn = page.getByRole('button', { name: /Start|Yes/i }).first();
        await startBtn.waitFor({ state: 'visible', timeout: 40000 });
        await startBtn.click();

        // 1. Upload ID
        console.log('Uploading Compliance ID...');
        const idPath = getFixturePath('compliance', 'id');
        if (idPath) {
            await uploadToTypebot(page, idPath);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Continue|Next/i }).first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // 2. Upload Job Letter
        console.log('Uploading Compliance Job Letter...');
        const jobPath = getFixturePath('compliance', 'jobletter');
        if (jobPath) {
            await uploadToTypebot(page, jobPath);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Continue|Next/i }).first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // 3. Upload Proof of Address
        console.log('Uploading Compliance Proof of Address...');
        const addressPath = getFixturePath('compliance', 'proofofaddress');
        if (addressPath) {
            await uploadToTypebot(page, addressPath);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Continue|Next|Submit|Finish/i }).first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Verify Completion
        console.log('Verifying completion message...');
        await expect(page.getByText(/Compliance check started/i)).toBeVisible({ timeout: 30000 });
        console.log('Compliance Bot UI stage complete.');

        // Verify Email Receipt
        const emailSubject = 'Compliance Update';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Compliance Bot Test',
                `The Compliance bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }

        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
