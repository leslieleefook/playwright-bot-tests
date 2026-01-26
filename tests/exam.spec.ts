import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath, clickTypebotButton, waitForTypebotButtonOrAdvance } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/exam';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Exam Bot Interaction Flow', () => {
    test('should trigger exam grade email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Exam Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        
        // Wait for typing animation to complete before clicking consent
        console.log('Waiting for initial typing animation...');
        await page.waitForTimeout(5000);

        // Accept consent first
        console.log('Accepting consent...');
        try {
            await clickTypebotButton(page, 'Yes I consent', 30000);
        } catch (e) {
            console.log('Retrying consent click with broader pattern...');
            await clickTypebotButton(page, 'Yes|consent|I consent', 20000);
        }
        
        // Wait for flow to advance after consent
        console.log('Waiting for flow to advance after consent...');
        await page.waitForTimeout(5000);

        // Upload Quiz
        console.log('Uploading Quiz...');
        const quizPath = getFixturePath('exam', 'quizz');
        if (quizPath) {
            await uploadToTypebot(page, quizPath);
            // Wait for button OR flow to auto-advance
            await waitForTypebotButtonOrAdvance(page, 'Next|Continue|Skip|Send', 15000);
            await page.waitForTimeout(2000);
        }

        // Upload Answers
        console.log('Uploading Answers...');
        const ansPath = getFixturePath('exam', 'answers');
        if (ansPath) {
            await uploadToTypebot(page, ansPath);
            // Wait for button OR flow to auto-advance
            await waitForTypebotButtonOrAdvance(page, 'Next|Continue|Skip|Send', 15000);
            await page.waitForTimeout(2000);
        }

        // Upload Response 1
        console.log('Uploading Response Image...');
        const res1Path = getFixturePath('exam', 'response1');
        if (res1Path) {
            await uploadToTypebot(page, res1Path);
            // Wait for button OR flow to auto-advance
            await waitForTypebotButtonOrAdvance(page, 'Submit|Next|Continue|Skip|Send', 15000);
            await page.waitForTimeout(2000);
        }

        // Verify Completion
        console.log('Verifying submission completion...');
        await page.waitForTimeout(10000);
        console.log('Exam Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Exam Grade';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Exam Bot Test',
                `The Exam bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
