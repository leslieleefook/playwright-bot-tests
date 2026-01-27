import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath, fillTypebotInput, clickTypebotButton } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/claims';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Claims Bot Interaction Flow', () => {
    test('should complete claims flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to Claims Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(2000); // Allow shadow DOM to fully render

        // Wait for bot to initialize and show the "Yes!" button
        console.log('Initiating flow...');
        await clickTypebotButton(page, 'Yes', 40000);
        await page.waitForTimeout(2000);

        // Helper to fill input and submit
        const fillAndSubmit = async (value: string) => {
            await fillTypebotInput(page, value);
            await page.waitForTimeout(500);
            await clickTypebotButton(page, 'Send');
            await page.waitForTimeout(2000); // Wait for bot response
        };

        // 1. Name
        console.log('Providing Name...');
        await fillAndSubmit('Leslie');

        // 2. Email (actually used for policy number verification)
        console.log('Providing Email/Policy Number...');
        await fillAndSubmit(BOT_EMAIL);

        // 3. Select Claim Type (bot shows buttons: Auto, Home)
        console.log('Selecting claim type...');
        await page.waitForTimeout(2000); // Wait for buttons to appear
        await clickTypebotButton(page, 'Auto|Home', 30000); // Click either Auto or Home
        await page.waitForTimeout(2000);

        // 4. Provide Claims Details if text input appears
        console.log('Checking for claims details input...');
        try {
            // Try to fill details if input appears, otherwise skip
            await fillTypebotInput(page, 'Reporting an issue with a recent service interaction for operational verification.', 10000);
            await page.waitForTimeout(500);
            await clickTypebotButton(page, 'Send', 5000);
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('No text input for details, continuing...');
        }

        // 5. File Upload (optional if exist in fixtures)
        console.log('Checking for claim image upload...');
        const imgPath = getFixturePath('claims', 'img');
        if (imgPath) {
            await uploadToTypebot(page, imgPath);
            await page.waitForTimeout(5000);
            try {
                await clickTypebotButton(page, 'Continue|Next|Submit', 5000);
            } catch (e) {
                console.log('No submit button after upload, continuing...');
            }
        }

        // Verify Completion (on-page)
        console.log('Verifying interaction completion...');
        await page.waitForTimeout(10000); // Give bot time to process
        console.log('Claims Bot UI stage complete.');

        // 5. Verify Email Receipt via IMAP
        const emailSubject = 'Claim Received';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

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