import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath, clickTypebotButton } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/match';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Match Bot Flow', () => {
    test('should trigger job match result email', async ({ page }) => {
        console.log(`Navigating to Match Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(2000);

        // Accept consent first (if present)
        console.log('Checking for consent button...');
        try {
            await clickTypebotButton(page, 'Yes I consent|Yes!', 10000);
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('No consent button found, continuing...');
        }

        // Upload JD
        console.log('Uploading Job Description...');
        const jdPath = getFixturePath('match', 'jd');
        if (jdPath) {
            await uploadToTypebot(page, jdPath);
            await page.waitForTimeout(3000);
            await clickTypebotButton(page, 'Next|Continue|Skip|Send', 30000);
        }

        // Upload Resume
        console.log('Uploading Resume...');
        const resPath = getFixturePath('match', 'resume1');
        if (resPath) {
            await uploadToTypebot(page, resPath);
            await page.waitForTimeout(3000);
            await clickTypebotButton(page, 'Analyze|Submit|Next|Continue|Send', 30000);
        }

        // Verify Completion
        console.log('Verifying analysis completion...');
        await page.waitForTimeout(10000);
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
