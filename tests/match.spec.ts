import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL } from '../utils/constants.ts';

const BOT_URL = 'https://bot.incusservices.com/match';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';
const NOTIFY_ON_FAILURE = 'leslieleefook@incusservices.com';

test.describe('Match Bot Flow', () => {
    test('should trigger job match result email', async ({ page }) => {
        await page.goto(BOT_URL);

        // Upload JD
        console.log('Uploading Job Description...');
        const jdPath = getFixturePath('match', 'jd');
        if (jdPath) {
            await uploadToTypebot(page, jdPath);
            await page.waitForTimeout(2000);
            const next = page.locator('button.cs_button, button:has-text("Next")').first();
            if (await next.isVisible()) await next.click();
        }

        // Upload Resume
        console.log('Uploading Resume...');
        const resPath = getFixturePath('match', 'resume1');
        if (resPath) {
            await uploadToTypebot(page, resPath);
            await page.waitForTimeout(2000);
            const next = page.locator('button.cs_button, button:has-text("Analyze")|button:has-text("Submit")').first();
            if (await next.isVisible()) await next.click();
        }

        // Verify Completion
        await expect(page.getByText(/Match analysis complete/i)).toBeVisible({ timeout: 20000 });

        // Verify Email
        const emailSubject = 'Job Match Result';
        const mail = await waitForEmailImap(emailSubject, 2 * 60 * 1000);

        if (!mail) {
            await sendEmail(NOTIFY_ON_FAILURE, 'FAILED: Match Bot Test', `Failed to receive "${emailSubject}"`);
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
    });
});
