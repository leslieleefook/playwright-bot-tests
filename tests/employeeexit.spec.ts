import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { fillTypebotInput, clickTypebotButton } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/employeeexit';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Employee Exit Bot Interaction Flow', () => {
    test('should complete exit interview flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to Employee Exit Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        
        // Wait for typing animation to complete
        console.log('Waiting for typing animation to complete...');
        await page.waitForTimeout(5000);

        // Click Ready button to start the flow
        console.log('Clicking Ready to start...');
        await clickTypebotButton(page, 'Ready', 30000);
        await page.waitForTimeout(3000);

        // Helper to fill input and submit
        const fillAndSubmit = async (value: string, fieldName: string) => {
            console.log(`Filling ${fieldName}...`);
            await page.waitForTimeout(2000); // Wait for typing animation
            await fillTypebotInput(page, value);
            await page.waitForTimeout(500);
            await clickTypebotButton(page, 'Send', 10000);
            await page.waitForTimeout(3000);
        };

        // The bot now uses text inputs for interview questions
        // Fill in sample responses for the exit interview
        await fillAndSubmit('John Doe', 'Name');
        await fillAndSubmit(BOT_EMAIL, 'Email');
        await fillAndSubmit('Software Developer', 'Position');
        await fillAndSubmit('Engineering', 'Department');
        await fillAndSubmit('Better career opportunity', 'Reason for leaving');
        await fillAndSubmit('Great team and learning environment', 'What did you enjoy most');
        await fillAndSubmit('Work-life balance could improve', 'Areas for improvement');
        await fillAndSubmit('Yes, would recommend', 'Would you recommend company');

        // Verify Completion
        console.log('Verifying interview completion...');
        await page.waitForTimeout(10000);
        console.log('Employee Exit Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Exit Feedback';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Employee Exit Bot Test',
                `The Employee Exit bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
