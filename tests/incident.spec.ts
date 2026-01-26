import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/incident';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Incident Bot Interaction Flow', () => {
    test('should trigger incident confirmation email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Incident Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Upload Scene
        console.log('Uploading Incident Scene...');
        const scenePath = getFixturePath('incident', 'scence'); // Preserving user typo 'scence'
        if (scenePath) {
            await uploadToTypebot(page, scenePath);
            await page.waitForTimeout(3000);
            const next = page.locator('button.cs_button, button:has-text("Next"), button:has-text("Continue")').first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Upload Injury
        console.log('Uploading Incident Injury...');
        const injuryPath = getFixturePath('incident', 'injury');
        if (injuryPath) {
            await uploadToTypebot(page, injuryPath);
            await page.waitForTimeout(3000);
            const next = page.locator('button.cs_button, button:has-text("Submit"), button:has-text("Next")').first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Verify Completion
        console.log('Verifying incident reporting completion...');
        await expect(page.getByText(/Incident reported/i)).toBeVisible({ timeout: 30000 });
        console.log('Incident Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Incident Report Confirmation';
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
                'FAILED: Incident Bot Test',
                `The Incident bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
