import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL } from '../utils/constants.ts';

const BOT_URL = 'https://bot.incusservices.com/exam';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';
const NOTIFY_ON_FAILURE = 'leslieleefook@incusservices.com';

test.describe('Exam Bot Flow', () => {
    test('should trigger exam grade email', async ({ page }) => {
        await page.goto(BOT_URL);

        // Upload Quiz
        console.log('Uploading Quiz...');
        const quizPath = getFixturePath('exam', 'quizz');
        if (quizPath) {
            await uploadToTypebot(page, quizPath);
            await page.waitForTimeout(2000);
            const next = page.getByRole('button', { name: /Next|Continue/i }).first();
            if (await next.isVisible()) await next.click();
        }

        // Upload Answers
        console.log('Uploading Answers...');
        const ansPath = getFixturePath('exam', 'answers');
        if (ansPath) {
            await uploadToTypebot(page, ansPath);
            await page.waitForTimeout(2000);
            const next = page.getByRole('button', { name: /Next|Continue/i }).first();
            if (await next.isVisible()) await next.click();
        }

        // Upload Response 1
        console.log('Uploading Response Image...');
        const res1Path = getFixturePath('exam', 'response1');
        if (res1Path) {
            await uploadToTypebot(page, res1Path);
            await page.waitForTimeout(2000);
            const next = page.getByRole('button', { name: /Submit|Next|Continue/i }).first();
            if (await next.isVisible()) await next.click();
        }

        // Verify Completion
        await expect(page.getByText(/Exam submitted/i)).toBeVisible({ timeout: 20000 });

        // Verify Email
        const emailSubject = 'Exam Grade';
        const mail = await waitForEmailImap(emailSubject, 2 * 60 * 1000);

        if (!mail) {
            await sendEmail(NOTIFY_ON_FAILURE, 'FAILED: Exam Bot Test', `Failed to receive "${emailSubject}"`);
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
    });
});
