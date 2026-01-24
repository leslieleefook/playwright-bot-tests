import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL } from '../utils/constants.ts';

const BOT_URL = 'https://bot.incusservices.com/incident';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';
const NOTIFY_ON_FAILURE = 'leslieleefook@incusservices.com';

test.describe('Incident Bot Flow', () => {
    test('should trigger incident confirmation email', async ({ page }) => {
        await page.goto(BOT_URL);

        // Upload Scene
        console.log('Uploading Incident Scene...');
        const scenePath = getFixturePath('incident', 'scence'); // Preserving user typo
        if (scenePath) {
            await uploadToTypebot(page, scenePath);
            await page.waitForTimeout(2000);
            const next = page.locator('button.cs_button, button:has-text("Next"), button:has-text("Continue")').first();
            if (await next.isVisible()) await next.click();
        }

        // Upload Injury
        console.log('Uploading Incident Injury...');
        const injuryPath = getFixturePath('incident', 'injury');
        if (injuryPath) {
            await uploadToTypebot(page, injuryPath);
            await page.waitForTimeout(2000);
            const next = page.locator('button.cs_button, button:has-text("Submit"), button:has-text("Next")').first();
            if (await next.isVisible()) await next.click();
        }

        // Verify Completion
        await expect(page.getByText(/Incident reported/i)).toBeVisible({ timeout: 20000 });

        // Verify Email
        const emailSubject = 'Incident Report Confirmation';
        const mail = await waitForEmailImap(emailSubject, 2 * 60 * 1000);

        if (!mail) {
            await sendEmail(NOTIFY_ON_FAILURE, 'FAILED: Incident Bot Test', `Failed to receive "${emailSubject}"`);
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
    });
});
