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

        // Accept consent first (if present)
        console.log('Checking for consent button...');
        const consentBtn = page.getByRole('button', { name: /Yes I consent|Yes!/i }).first();
        if (await consentBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
            await consentBtn.click();
            await page.waitForTimeout(2000);
        }

        // Upload Scene
        console.log('Uploading Incident Scene...');
        const scenePath = getFixturePath('incident', 'scence');
        if (scenePath) {
            await uploadToTypebot(page, scenePath);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Next|Continue|Skip|Send/i }).first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Upload Injury
        console.log('Uploading Incident Injury...');
        const injuryPath = getFixturePath('incident', 'injury');
        if (injuryPath) {
            await uploadToTypebot(page, injuryPath);
            await page.waitForTimeout(3000);
            const next = page.getByRole('button', { name: /Submit|Next|Continue|Skip|Send/i }).first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Verify Completion
        console.log('Verifying incident reporting completion...');
        await page.waitForTimeout(10000);
        console.log('Incident Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Incident Report Confirmation';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

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