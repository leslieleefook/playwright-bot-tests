import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/exam';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Exam Bot Interaction Flow', () => {
    test('should trigger exam grade email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Exam Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Upload Quiz
        console.log('Uploading Quiz...');
        const quizPath = getFixturePath('exam', 'quizz');
        if (quizPath) {
            await uploadToTypebot(page, quizPath);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Next|Continue/i }).first();
            await next.waitFor({ state: 'visible', timeout: 10000 });
            await next.click();
        }

        // Upload Answers
        console.log('Uploading Answers...');
        const ansPath = getFixturePath('exam', 'answers');
        if (ansPath) {
            await uploadToTypebot(page, ansPath);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Next|Continue/i }).first();
            await next.waitFor({ state: 'visible', timeout: 10000 });
            await next.click();
        }

        // Upload Response 1
        console.log('Uploading Response Image...');
        const res1Path = getFixturePath('exam', 'response1');
        if (res1Path) {
            await uploadToTypebot(page, res1Path);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Submit|Next|Continue/i }).first();
            await next.waitFor({ state: 'visible', timeout: 10000 });
            await next.click();
        }

        // Verify Completion
        console.log('Verifying submission completion...');
        await expect(page.getByText(/Exam submitted/i)).toBeVisible({ timeout: 30000 });
        console.log('Exam Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Exam Grade';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Exam Bot Test',
                `The Exam bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
