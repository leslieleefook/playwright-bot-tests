import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL } from '../utils/constants.ts';

const BOT_URL = 'https://bot.incusservices.com/claims';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';
const NOTIFY_ON_FAILURE = 'leslieleefook@incusservices.com';

test.describe('Claims Bot Email Flow', () => {
    test('should trigger claim email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Claims Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Start button
        const startBtn = page.getByRole('button', { name: /Yes/i }).first();
        await startBtn.waitFor({ state: 'visible', timeout: 20000 });
        console.log('Initiating flow...');
        await startBtn.click();

        // 1. Name
        console.log('Waiting for Name input...');
        const nameInput = page.locator('input.text-input, input[placeholder*="name"], .typebot-input').first();
        await nameInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Filling Name...');
        await nameInput.fill('Leslie (Bot Test)');
        await page.keyboard.press('Enter');

        // 2. Email
        console.log('Waiting for Email input...');
        const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[name*="email"]').first();
        await emailInput.waitFor({ state: 'attached', timeout: 15000 });
        console.log('Filling Email...');
        await emailInput.fill(BOT_EMAIL);
        await page.keyboard.press('Enter');

        // 3. Claims Details
        console.log('Waiting for Details input...');
        const detailsInput = page.locator('input.text-input, textarea, input[placeholder*="Type"], .typebot-input').first();
        await detailsInput.waitFor({ state: 'attached', timeout: 15000 });
        console.log('Filling Details...');
        await detailsInput.fill('Automated claim test for operational verification with file upload.');
        await page.keyboard.press('Enter');

        // 4. File Upload (Image)
        console.log('Uploading claim image...');
        const imgPath = getFixturePath('claims', 'img');
        if (imgPath) {
            await uploadToTypebot(page, imgPath);
            // Wait a bit for upload to process or click next
            await page.waitForTimeout(3000);
            const nextBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button.cs_button').first();
            if (await nextBtn.isVisible()) await nextBtn.click();
        }

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await expect(page.getByText(/Claim submitted successfully/i)).toBeVisible({ timeout: 20000 });
        console.log('Claims Bot UI stage complete.');

        // Verify Email Receipt via IMAP
        const emailSubject = 'Claim Received';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 2 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Claims Bot Email Test',
                `The Claims bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`[SUCCESS] Verified receipt of email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
