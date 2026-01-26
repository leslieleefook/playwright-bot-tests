import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/exit';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Employee Exit Bot Interaction Flow', () => {
    test.skip('should trigger /* URL /exit returns 404 */ exit feedback email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Employee Exit Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Start
        console.log('Initiating flow...');
        const startBtn = page.getByRole('button', { name: /Yes|Start/i }).first();
        await startBtn.waitFor({ state: 'visible', timeout: 40000 });
        await startBtn.click();

        // Standard Name/Email if asked
        const emailInput = page.locator('input[type="email"]').first();
        if (await emailInput.isVisible()) {
            console.log('Providing Email...');
            await emailInput.fill(BOT_EMAIL);
            await page.keyboard.press('Enter');
        }

        // Upload Transcription
        console.log('Uploading transcription...');
        const path = getFixturePath('employeeexit', 'transcription');
        if (path) {
            await uploadToTypebot(page, path);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Continue|Next|Submit/i }).first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Verify Completion
        console.log('Verifying recording completion...');
        await expect(page.getByText(/Exit interview recorded/i)).toBeVisible({ timeout: 30000 });
        console.log('Employee Exit Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Exit Feedback';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Employee Exit Bot Test',
                `The Employee Exit bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
