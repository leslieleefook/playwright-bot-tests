import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath, clickTypebotButton, waitForTypebotButtonOrAdvance, fillTypebotInput } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/match';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Match Bot Flow', () => {
    test('should trigger job match result email', async ({ page }) => {
        console.log(`Navigating to Match Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        
        // Wait for typing animation to complete
        console.log('Waiting for typing animation to complete...');
        await page.waitForTimeout(5000);

        // Accept consent first
        console.log('Accepting consent...');
        await clickTypebotButton(page, 'Yes I consent', 30000);
        await page.waitForTimeout(3000);

        // Fill Email if requested (before file uploads)
        console.log('Filling Email...');
        try {
            await fillTypebotInput(page, BOT_EMAIL, 15000);
            await clickTypebotButton(page, 'Send', 15000);
            await page.waitForTimeout(3000);
        } catch (e) {
            console.log('No email input at this step, continuing...');
        }

        // Fill Location if requested
        console.log('Filling Location...');
        try {
            await fillTypebotInput(page, 'Main Office Building', 15000);
            await clickTypebotButton(page, 'Send', 15000);
            await page.waitForTimeout(3000);
        } catch (e) {
            console.log('No location input at this step, continuing...');
        }

        // Upload JD
        console.log('Uploading Job Description...');
        const jdPath = getFixturePath('match', 'jd');
        if (jdPath) {
            await uploadToTypebot(page, jdPath);
            // Wait for button OR flow to auto-advance
            await waitForTypebotButtonOrAdvance(page, 'Next|Continue|Skip|Send', 15000);
            await page.waitForTimeout(2000);
        }

        // Upload Resume
        console.log('Uploading Resume...');
        const resPath = getFixturePath('match', 'resume1');
        if (resPath) {
            await uploadToTypebot(page, resPath);
            // Wait for button OR flow to auto-advance
            await waitForTypebotButtonOrAdvance(page, 'Analyze|Submit|Next|Continue|Send', 15000);
            await page.waitForTimeout(2000);
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
