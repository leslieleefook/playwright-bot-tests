import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL } from '../utils/constants.ts';

const BOT_URL = 'https://bot.incusservices.com/compliance';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';
const NOTIFY_ON_FAILURE = 'leslieleefook@incusservices.com';

test.describe('Compliance Bot Email Flow', () => {
    test('should trigger compliance email and verify multi-file receipt', async ({ page }) => {
        console.log(`Navigating to Compliance Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Start
        const startBtn = page.getByRole('button', { name: /Start|Yes/i }).first();
        if (await startBtn.isVisible()) await startBtn.click();

        // 1. Upload ID
        console.log('Uploading Compliance ID...');
        const idPath = getFixturePath('compliance', 'id');
        if (idPath) {
            await uploadToTypebot(page, idPath);
            await page.waitForTimeout(2000);
            const next = page.getByRole('button', { name: /Continue|Next/i }).first();
            if (await next.isVisible()) await next.click();
        }

        // 2. Upload Job Letter
        console.log('Uploading Compliance Job Letter...');
        const jobPath = getFixturePath('compliance', 'jobletter');
        if (jobPath) {
            await uploadToTypebot(page, jobPath);
            await page.waitForTimeout(2000);
            const next = page.getByRole('button', { name: /Continue|Next/i }).first();
            if (await next.isVisible()) await next.click();
        }

        // 3. Upload Proof of Address
        console.log('Uploading Compliance Proof of Address...');
        const addressPath = getFixturePath('compliance', 'proofofaddress');
        if (addressPath) {
            await uploadToTypebot(page, addressPath);
            await page.waitForTimeout(2000);
            const next = page.getByRole('button', { name: /Continue|Next/i | Submit / i }).first();
            if (await next.isVisible()) await next.click();
        }

        // Verify Completion
        console.log('Verifying completion message...');
        await expect(page.getByText(/Compliance check started/i)).toBeVisible({ timeout: 20000 });

        // Verify Email Receipt
        const emailSubject = 'Compliance Update';
        const mail = await waitForEmailImap(emailSubject, 2 * 60 * 1000);

        if (!mail) {
            await sendEmail(NOTIFY_ON_FAILURE, 'FAILED: Compliance Bot Test', `Failed to receive "${emailSubject}" for ${BOT_EMAIL}`);
            throw new Error(`Email not found: ${emailSubject}`);
        }

        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
    });
});
