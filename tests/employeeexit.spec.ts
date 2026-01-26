import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/employeeexit';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Employee Exit Bot Interaction Flow', () => {
    test('should trigger exit feedback email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Employee Exit Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Accept consent first (if present)
        console.log('Checking for consent button...');
        const consentBtn = page.getByRole('button', { name: /Yes I consent|Yes!/i }).first();
        if (await consentBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
            await consentBtn.click();
            await page.waitForTimeout(2000);
        }

        // Helper to wait for and fill textbox
        const fillTextbox = async (value: string) => {
            const textbox = page.getByRole('textbox').first();
            await textbox.waitFor({ state: 'visible', timeout: 30000 });
            await textbox.fill(value);
            const sendBtn = page.getByRole('button', { name: /Send/i }).first();
            await sendBtn.click();
            await page.waitForTimeout(2000);
        };

        // Provide email if asked
        const emailInput = page.locator('input[type="email"]').first();
        if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('Providing Email...');
            await emailInput.fill(BOT_EMAIL);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
        }

        // Upload Transcription if needed
        console.log('Checking for transcription upload...');
        const transcriptionPath = getFixturePath('employeeexit', 'transcription');
        if (transcriptionPath) {
            await uploadToTypebot(page, transcriptionPath);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Continue|Next|Submit|Skip|Send/i }).first();
            if (await next.isVisible({ timeout: 5000 }).catch(() => false)) {
                await next.click();
            }
        }

        // Verify Completion
        console.log('Verifying recording completion...');
        await page.waitForTimeout(10000);
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