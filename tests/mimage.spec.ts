import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/mimage';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Mimage Bot Interaction Flow', () => {
    test('should trigger processed image result email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Mimage Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Accept consent first
        console.log('Accepting consent...');
        const consentBtn = page.getByRole('button', { name: /Yes I consent/i }).first();
        await consentBtn.waitFor({ state: 'visible', timeout: 40000 });
        await consentBtn.click();
        await page.waitForTimeout(2000);

        // Upload Image
        console.log('Uploading image for processing...');
        const imgPath = getFixturePath('mimage', 'image');
        if (imgPath) {
            await uploadToTypebot(page, imgPath);
            await page.waitForTimeout(3000);
            
            // Wait for and click next/submit button
            const nextBtn = page.getByRole('button', { name: /Continue|Skip|Submit|Send/i }).first();
            if (await nextBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
                await nextBtn.click();
            }
        }

        // Verify Completion
        console.log('Verifying image processing completion...');
        await page.waitForTimeout(10000); // Give time for processing
        console.log('Mimage Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Processed Image Result';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Mimage Bot Test',
                `The Mimage bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});