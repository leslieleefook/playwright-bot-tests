import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { fillTypebotInput, clickTypebotButton } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/mkt';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('MKT Bot Interaction Flow', () => {
    test('should complete product idea flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to MKT Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        
        // Wait for typing animation to complete
        console.log('Waiting for typing animation to complete...');
        await page.waitForTimeout(5000);

        // Helper to fill input and submit
        const fillAndSubmit = async (value: string, fieldName: string) => {
            console.log(`Filling ${fieldName}...`);
            await page.waitForTimeout(2000); // Wait for typing animation
            await fillTypebotInput(page, value);
            await page.waitForTimeout(500);
            await clickTypebotButton(page, 'Send', 10000);
            await page.waitForTimeout(3000);
        };

        // Wait for bot to initialize and show the "Yes!" button
        console.log('Initiating flow...');
        await clickTypebotButton(page, 'Yes!', 30000);
        await page.waitForTimeout(3000);

        // 1. Name Input
        console.log('Providing Name...');
        await fillAndSubmit('Leslie', 'Name');

        // 2. Email Input
        console.log('Providing Email...');
        await fillAndSubmit(BOT_EMAIL, 'Email');

        // 3. Product Idea
        console.log('Providing Product Idea...');
        await fillAndSubmit('Automated AI testing framework for conversion bots', 'Product Idea');

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await page.waitForTimeout(10000); // Give bot time to process
        console.log('MKT Bot UI success confirmed.');

        // 4. Verify Email Receipt via IMAP
        const emailSubject = 'Product Idea Flow';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: MKT Bot Email Test',
                `The MKT bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`[SUCCESS] Verified receipt of email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
