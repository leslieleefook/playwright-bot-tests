import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL } from '../utils/constants.ts';

const BOT_URL = 'https://go.incusservices.com/airoi';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';
const NOTIFY_ON_FAILURE = 'leslieleefook@incusservices.com';

test.describe('Airoi Bot Email Flow', () => {
    test('should trigger email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Airoi ROI Calculator: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        const frames = page.frames();
        console.log(`Detected ${frames.length} frames.`);
        frames.forEach((f, i) => console.log(`Frame ${i}: ${f.url()}`));

        // Step 0: Welcome / Continue
        console.log('Starting form...');
        const buttons = await page.locator('button').allInnerTexts();
        console.log('Available buttons:', buttons);

        const startBtn = page.locator('button').filter({ hasText: /Continue|Start|Calculator/i }).first();
        await startBtn.waitFor({ state: 'visible', timeout: 15000 });
        await startBtn.click({ force: true });
        await page.waitForLoadState('networkidle');

        // Step 1: Tasks
        console.log('Filling Step 1 (Tasks)...');
        const tasksField = page.locator('textarea, .typebot-input, input[id*="field"]').first();
        await tasksField.waitFor({ state: 'visible', timeout: 30000 });
        await tasksField.fill('Automating repeated daily operational data entry and reporting.');
        await page.click('button.cs_button, button:has-text("Next")');
        console.log('Step 1 complete.');

        // Step 2: Hours spent
        console.log('Filling Step 2 (Hours)...');
        await page.fill('textarea#fieldpage-2-field-0', '4');
        await page.click('button.cs_button');
        console.log('Step 2 complete.');

        // Step 3: Efficiency gain
        console.log('Filling Step 3 (Efficiency)...');
        await page.fill('input#fieldpage-3-field-0', '60');
        await page.click('button.cs_button');
        console.log('Step 3 complete.');

        // Step 4: Employees
        console.log('Filling Step 4 (Employees)...');
        await page.fill('input#fieldpage-4-field-0', '15');
        await page.click('button.cs_button');
        console.log('Step 4 complete.');

        // Step 5: Monthly Salary
        console.log('Filling Step 5 (Salary)...');
        await page.fill('input#fieldpage-5-field-0', '5000');
        await page.click('button.cs_button');
        console.log('Step 5 complete.');

        // Step 6: Email
        console.log('Filling Step 6 (Email)...');
        await page.fill('input#fieldpage-6-field-0', BOT_EMAIL);
        await page.click('button.cs_button'); // Final Submit
        console.log('Step 6 complete.');

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await expect(page.getByText('Congratulations you have completed!')).toBeVisible({ timeout: 20000 });
        console.log('Airoi ROI Calculator UI success confirmed.');

        // Verify Email Receipt via IMAP
        const emailSubject = 'ROI Calculation Result'; // Adjusted based on bot spec
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 2 * 60 * 1000); // 2 minute timeout

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Airoi Bot Email Test',
                `The Airoi bot test failed to generate a "${emailSubject}" email for ${TEST_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`[SUCCESS] Verified receipt of email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
