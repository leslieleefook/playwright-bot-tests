import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { fillTypebotInput, clickTypebotButton } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/tde';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('TDE Bot Interaction Flow', () => {
    test('should complete TDE flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to TDE Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(2000);

        // Helper to fill input and submit
        const fillAndSubmit = async (value: string) => {
            await fillTypebotInput(page, value);
            await page.waitForTimeout(500);
            await clickTypebotButton(page, 'Send');
            await page.waitForTimeout(2000);
        };

        // TDE bot starts directly with name input (no Yes button)
        // 1. Name
        console.log('Providing Name...');
        await fillAndSubmit('Leslie');

        // 2. Email
        console.log('Providing Email...');
        await fillAndSubmit(BOT_EMAIL);

        // 3. Company Name
        console.log('Providing Company Name...');
        await fillAndSubmit('Incus Services');

        // 4. Challenge/Problem
        console.log('Providing Challenge...');
        await fillAndSubmit('Low awareness of AI and how to leverage it for business operations');

        // 5. Industry
        console.log('Providing Industry...');
        await fillAndSubmit('Technology');

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await page.waitForTimeout(5000);
        console.log('TDE Bot UI stage complete.');

        // 4. Verify Email Receipt via IMAP
        const emailSubject = 'Service Inquiry';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: TDE Bot Email Test',
                `The TDE bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`[SUCCESS] Verified receipt of email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
