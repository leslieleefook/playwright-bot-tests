import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/match';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Match Bot Flow', () => {
    test('should trigger job match result email', async ({ page }) => {
        console.log(`Navigating to Match Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Upload JD
        console.log('Uploading Job Description...');
        const jdPath = getFixturePath('match', 'jd');
        if (jdPath) {
            await uploadToTypebot(page, jdPath);
            await page.waitForTimeout(3000);
            const next = page.locator('button.cs_button, button:has-text("Next")').first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Upload Resume
        console.log('Uploading Resume...');
        const resPath = getFixturePath('match', 'resume1');
        if (resPath) {
            await uploadToTypebot(page, resPath);
            await page.waitForTimeout(3000);
            const next = page.locator('button.cs_button, button:has-text("Analyze"), button:has-text("Submit")').first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Verify Completion
        console.log('Verifying analysis completion...');
        await expect(page.getByText(/Match analysis complete/i)).toBeVisible({ timeout: 30000 });
        console.log('Match Bot UI success confirmed.');

        // Verify Email
        const emailSubject = 'Job Match Result';
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
                'FAILED: Match Bot Test',
                `The Match bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
