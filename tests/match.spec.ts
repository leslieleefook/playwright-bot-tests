import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/match';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

/**
 * Shadow-piercing selectors for Typebot web component.
 * Typebot renders inside <typebot-standard> with shadow DOM.
 */
const TYPEBOT = {
    button: (pattern: string) => `typebot-standard >> button:text-matches("${pattern}", "i")`,
    text: (pattern: string) => `typebot-standard >> text=${pattern}`,
};

test.describe('Match Bot Flow', () => {
    test('should trigger job match result email', async ({ page }) => {
        console.log(`Navigating to Match Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(2000); // Allow shadow DOM to render

        // Wait for initial bot interaction - some bots have a start button
        console.log('Checking for initial bot interaction...');
        try {
            const startBtn = page.locator(TYPEBOT.button('Start|Begin|Yes|OK|Continue|Upload|Match')).first();
            await startBtn.waitFor({ state: 'visible', timeout: 10000 });
            await startBtn.click();
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('No initial button found, proceeding with flow...');
        }

        // Upload JD
        console.log('Uploading Job Description...');
        const jdPath = getFixturePath('match', 'jd');
        if (jdPath) {
            await uploadToTypebot(page, jdPath);
            await page.waitForTimeout(3000);
            const next = page.locator(TYPEBOT.button('Next')).first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Upload Resume
        console.log('Uploading Resume...');
        const resPath = getFixturePath('match', 'resume1');
        if (resPath) {
            await uploadToTypebot(page, resPath);
            await page.waitForTimeout(3000);
            const next = page.locator(TYPEBOT.button('Analyze|Submit')).first();
            await next.waitFor({ state: 'visible', timeout: 30000 });
            await next.click();
        }

        // Verify Completion
        console.log('Verifying analysis completion...');
        await expect(page.getByText(/Match analysis complete/i)).toBeVisible({ timeout: 30000 });
        console.log('Match Bot UI success confirmed.');

        // Verify Email
        const emailSubject = 'Job Match Result';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Match Bot Test',
                `The Match bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
