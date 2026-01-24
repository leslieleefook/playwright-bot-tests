import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL } from '../utils/constants.ts';

const BOT_URL = 'https://bot.incusservices.com/mimage';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';
const NOTIFY_ON_FAILURE = 'leslieleefook@incusservices.com';

test.describe('Mimage Bot Flow', () => {
    test('should trigger processed image result email', async ({ page }) => {
        await page.goto(BOT_URL);

        // Upload Image
        console.log('Uploading image for processing...');
        const path = getFixturePath('mimage', 'image');
        if (path) {
            await uploadToTypebot(page, path);
            await page.waitForTimeout(3000);
            const next = page.locator('button.cs_button, button:has-text("Process")|button:has-text("Submit")').first();
            if (await next.isVisible()) await next.click();
        }

        // Verify Completion
        await expect(page.getByText(/Image processed/i)).toBeVisible({ timeout: 20000 });

        // Verify Email
        const emailSubject = 'Processed Image Result';
        const mail = await waitForEmailImap(emailSubject, 2 * 60 * 1000);

        if (!mail) {
            await sendEmail(NOTIFY_ON_FAILURE, 'FAILED: Mimage Bot Test', `Failed to receive "${emailSubject}"`);
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
    });
});
