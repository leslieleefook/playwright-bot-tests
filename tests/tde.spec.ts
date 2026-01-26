import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/tde';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

/**
 * Shadow-piercing selectors for Typebot web component.
 * Typebot renders inside <typebot-standard> with shadow DOM.
 */
const TYPEBOT = {
    button: (pattern: string) => `typebot-standard >> button:text-matches("${pattern}", "i")`,
    textInput: 'typebot-standard >> input[type="text"], typebot-standard >> textarea, typebot-standard >> input.typebot-input',
    emailInput: 'typebot-standard >> input[type="email"]',
    text: (pattern: string) => `typebot-standard >> text=${pattern}`,
};

test.describe('TDE Bot Interaction Flow', () => {
    test('should complete TDE flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to TDE Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(1000); // Allow shadow DOM to render

        // Initial prompt often asks if ready
        console.log('Initiating flow...');
        const startBtn = page.locator(TYPEBOT.button('Yes')).first();
        await startBtn.waitFor({ state: 'visible', timeout: 40000 });
        await startBtn.click();

        // 1. Name
        console.log('Providing Name...');
        const nameInput = page.locator(TYPEBOT.textInput).first();
        await nameInput.waitFor({ state: 'visible', timeout: 30000 });
        await nameInput.fill('Leslie');
        await page.keyboard.press('Enter');

        // 2. Email
        console.log('Providing Email...');
        const emailInput = page.locator(TYPEBOT.emailInput).first();
        await emailInput.waitFor({ state: 'visible', timeout: 30000 });
        await emailInput.fill(BOT_EMAIL);
        await page.keyboard.press('Enter');

        // 3. Service Interest/Details
        console.log('Providing Service Inquiry...');
        await page.waitForTimeout(1000); // Wait for next input to appear
        const inquiryInput = page.locator(TYPEBOT.textInput).first();
        await inquiryInput.waitFor({ state: 'visible', timeout: 30000 });
        await inquiryInput.fill('Inquiring about technical delivery excellence frameworks for cloud platforms.');
        await page.keyboard.press('Enter');

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await page.waitForTimeout(5000); // Wait for submission
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
