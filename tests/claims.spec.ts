import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/claims';
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

test.describe('Claims Bot Interaction Flow', () => {
    test('should complete claims flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to Claims Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(1000); // Allow shadow DOM to render

        // Wait for bot to initialize and show the "Yes!" button
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

        // 3. Claims Details
        console.log('Providing Claims Details...');
        await page.waitForTimeout(1000); // Wait for next input to appear
        const detailsInput = page.locator(TYPEBOT.textInput).first();
        await detailsInput.waitFor({ state: 'visible', timeout: 30000 });
        await detailsInput.fill('Reporting an issue with a recent service interaction for operational verification.');
        await page.keyboard.press('Enter');

        // 4. File Upload (optional if exist in fixtures)
        console.log('Checking for claim image upload...');
        const imgPath = getFixturePath('claims', 'img');
        if (imgPath) {
            await uploadToTypebot(page, imgPath);
            await page.waitForTimeout(5000);
            const nextBtn = page.locator(TYPEBOT.button('Continue|Next')).first();
            if (await nextBtn.isVisible()) {
                await nextBtn.click();
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
