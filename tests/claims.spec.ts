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
        const nameSelector = 'input.text-input, input[placeholder*="name"], .typebot-input input, .typebot-input textarea';
        await page.waitForSelector(nameSelector, { state: 'visible', timeout: 15000 });
        const nameInput = page.locator(nameSelector).first();
        console.log('Filling Name...');
        await nameInput.fill('Leslie (Bot Test)');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // 2. Email
        console.log('Waiting for Email input...');
        const emailSelector = 'input[type="email"], input[placeholder*="email"], input[name*="email"], .typebot-input input';
        await page.waitForSelector(emailSelector, { state: 'attached', timeout: 15000 });
        const emailInput = page.locator(emailSelector).first();
        console.log('Filling Email...');
        await emailInput.fill(BOT_EMAIL);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // 3. Claims Details
        console.log('Waiting for Details input...');
        const detailsSelector = 'textarea, input.text-input, input[placeholder*="Type"], .typebot-input textarea';
        await page.waitForSelector(detailsSelector, { state: 'attached', timeout: 15000 });
        const detailsInput = page.locator(detailsSelector).first();
        console.log('Filling Details...');
        await detailsInput.fill('Automated claim test with file upload.');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // 4. File Upload (Image)
        console.log('Uploading claim image...');
        const imgPath = getFixturePath('claims', 'img');
        if (imgPath) {
            await uploadToTypebot(page, imgPath);
            await page.waitForTimeout(5000);
            const nextBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button.cs_button').first();
            if (await nextBtn.isVisible()) {
                await nextBtn.click();
                await page.waitForTimeout(2000);
            }
        }

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await page.waitForTimeout(3000);
        await expect(page.locator('body')).toContainText(/submitted|successfully|thank/i, { timeout: 30000 });
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
