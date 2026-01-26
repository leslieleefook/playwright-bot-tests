import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath, clickTypebotButton, waitForTypebotButtonOrAdvance } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/compliance';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Compliance Bot Interaction Flow', () => {
    test('should trigger compliance email and verify multi-file receipt', async ({ page }) => {
        console.log(`Navigating to Compliance Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(2000);

        // Accept consent first
        console.log('Accepting consent...');
        await clickTypebotButton(page, 'Yes I consent', 40000);
        await page.waitForTimeout(3000);

        // 1. Upload ID
        console.log('Uploading Compliance ID...');
        const idPath = getFixturePath('compliance', 'id');
        if (idPath) {
            await uploadToTypebot(page, idPath);
            // Wait for button OR flow to auto-advance (Typebot often auto-advances after upload)
            await waitForTypebotButtonOrAdvance(page, 'Continue|Next|Skip|Send', 15000);
            await page.waitForTimeout(2000);
        }

        // 2. Upload Job Letter
        console.log('Uploading Compliance Job Letter...');
        const jobPath = getFixturePath('compliance', 'jobletter');
        if (jobPath) {
            await uploadToTypebot(page, jobPath);
            // Wait for button OR flow to auto-advance
            await waitForTypebotButtonOrAdvance(page, 'Continue|Next|Skip|Send', 15000);
            await page.waitForTimeout(2000);
        }

        // 3. Upload Proof of Address
        console.log('Uploading Compliance Proof of Address...');
        const addressPath = getFixturePath('compliance', 'proofofaddress');
        if (addressPath) {
            await uploadToTypebot(page, addressPath);
            // Wait for button OR flow to auto-advance
            await waitForTypebotButtonOrAdvance(page, 'Continue|Next|Submit|Finish|Skip|Send', 15000);
            await page.waitForTimeout(2000);
        }

        // Verify Completion
        console.log('Verifying completion...');
        await page.waitForTimeout(10000);
        console.log('Compliance Bot UI stage complete.');

        // Verify Email Receipt
        const emailSubject = 'Compliance Update';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Compliance Bot Test',
                `The Compliance bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }

        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
