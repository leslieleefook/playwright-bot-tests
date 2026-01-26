import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/mimage';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

/**
 * Shadow-piercing selectors for Typebot web component.
 * Typebot renders inside <typebot-standard> with shadow DOM.
 */
const TYPEBOT = {
    button: (pattern: string) => `typebot-standard >> button:text-matches("${pattern}", "i")`,
    text: (pattern: string) => `typebot-standard >> text=${pattern}`,
};

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
            const startBtn = page.locator(TYPEBOT.button('Start|Begin|Upload|Continue|Yes')).first();
            await startBtn.waitFor({ state: 'visible', timeout: 15000 });
            await startBtn.click();
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('No start button found, bot may start directly with upload...');
        }

        // Upload Image - wait for upload step to appear
        console.log('Uploading image for processing...');
        const path = getFixturePath('mimage', 'image');
        if (path) {
            await uploadToTypebot(page, path);
            await page.waitForTimeout(3000);
            const next = page.locator(TYPEBOT.button('Process|Submit|Continue|Next')).first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Verify Completion
        console.log('Verifying image processing completion...');
        await expect(page.getByText(/Image processed/i)).toBeVisible({ timeout: 30000 });
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
