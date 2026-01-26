import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath, clickTypebotButton, waitForTypebotButtonOrAdvance } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/incident';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Incident Bot Interaction Flow', () => {
    test('should trigger incident confirmation email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Incident Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(3000);

        // Accept consent first (if present)
        console.log('Checking for consent button...');
        try {
            await clickTypebotButton(page, 'Yes I consent|Yes!', 15000);
            await page.waitForTimeout(3000);
        } catch (e) {
            console.log('No consent button found, continuing...');
        }

        // Upload Scene
        console.log('Uploading Incident Scene...');
        const scenePath = getFixturePath('incident', 'scence');
        if (scenePath) {
            await uploadToTypebot(page, scenePath);
            // Wait for button OR flow to auto-advance
            await waitForTypebotButtonOrAdvance(page, 'Next|Continue|Skip|Send', 15000);
            await page.waitForTimeout(2000);
        }

        // Upload Injury
        console.log('Uploading Incident Injury...');
        const injuryPath = getFixturePath('incident', 'injury');
        if (injuryPath) {
            await uploadToTypebot(page, injuryPath);
            // Wait for button OR flow to auto-advance
            await waitForTypebotButtonOrAdvance(page, 'Submit|Next|Continue|Skip|Send', 15000);
            await page.waitForTimeout(2000);
        }

        // Verify Completion
        console.log('Verifying incident reporting completion...');
        await page.waitForTimeout(10000);
        console.log('Incident Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Incident Report Confirmation';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Incident Bot Test',
                `The Incident bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
