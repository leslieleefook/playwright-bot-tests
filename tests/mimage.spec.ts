import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath, fillTypebotInput, clickTypebotButton } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/mimage';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Mimage Bot Interaction Flow', () => {
    test('should trigger processed image result email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Mimage Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(2000); // Allow shadow DOM to render

        // First, initiate the flow - the bot may need a start button click
        console.log('Initiating flow...');
        try {
            await clickTypebotButton(page, 'Start|Begin|Upload|Continue|Yes', 15000);
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('No start button found, bot may start directly with upload...');
        }

        // Provide Name if asked
        console.log('Providing Name...');
        try {
            await fillTypebotInput(page, 'Leslie', 10000);
            await page.waitForTimeout(500);
            await clickTypebotButton(page, 'Send', 5000);
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('No name input, continuing...');
        }

        // Provide Email if asked
        console.log('Providing Email...');
        try {
            await fillTypebotInput(page, BOT_EMAIL, 10000);
            await page.waitForTimeout(500);
            await clickTypebotButton(page, 'Send', 5000);
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('No email input, continuing...');
        }

        // Upload Image - wait for upload step to appear
        console.log('Uploading image for processing...');
        const path = getFixturePath('mimage', 'image');
        if (path) {
            await uploadToTypebot(page, path);
            await page.waitForTimeout(3000);
            try {
                await clickTypebotButton(page, 'Process|Submit|Continue|Next|Send', 30000);
            } catch (e) {
                console.log('No submit button after upload, continuing...');
            }
        }

        // Verify Completion
        console.log('Verifying image processing completion...');
        await page.waitForTimeout(10000);
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
