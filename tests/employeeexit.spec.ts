import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL } from '../utils/constants.ts';

const BOT_URL = 'https://bot.incusservices.com/exit';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';
const NOTIFY_ON_FAILURE = 'leslieleefook@incusservices.com';

test.describe('Employee Exit Bot Flow', () => {
    test('should trigger exit feedback email', async ({ page }) => {
        await page.goto(BOT_URL);

        // Start
        const startBtn = page.getByRole('button', { name: /Yes|Start/i }).first();
        if (await startBtn.isVisible()) await startBtn.click();

        // Standard Name/Email if asked
        const emailInput = page.locator('input[type="email"]').first();
        if (await emailInput.isVisible()) {
            await emailInput.fill(BOT_EMAIL);
            await page.keyboard.press('Enter');
        }

        // Upload Transcription
        console.log('Uploading transcription...');
        const path = getFixturePath('employeeexit', 'transcription');
        if (path) {
            await uploadToTypebot(page, path);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Continue|Next|Submit/i }).first();
            if (await next.isVisible()) await next.click();
        }

        // Verify Completion
        await expect(page.getByText(/Exit interview recorded/i)).toBeVisible({ timeout: 20000 });

        // Verify Email
        const emailSubject = 'Exit Feedback';
        const mail = await waitForEmailImap(emailSubject, 2 * 60 * 1000);

        if (!mail) {
            await sendEmail(NOTIFY_ON_FAILURE, 'FAILED: Employee Exit Bot Test', `Failed to receive "${emailSubject}"`);
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
    });
});
