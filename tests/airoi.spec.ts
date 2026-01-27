import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://go.incusservices.com/airoi';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Airoi Bot Email Flow', () => {
    test('should trigger email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Airoi ROI Calculator: ${BOT_URL}...`);
        await page.goto(BOT_URL, { waitUntil: 'networkidle' });

        // Wait for form to fully load (may redirect to paperwork.incusservices.com)
        console.log('Waiting for form to load...');
        await page.waitForTimeout(3000);
        console.log(`Current URL: ${page.url()}`);

        // Step 1: Tasks - Fill and click Continue
        console.log('Filling Step 1 (Tasks)...');
        await page.fill('textarea#fieldpage-1-field-0', 'Automating repeated daily operational data entry and reporting.');
        
        // Click Continue button
        const continueBtn = page.locator('button.cs_button, button:has-text("Continue")').first();
        await continueBtn.waitFor({ state: 'visible', timeout: 20000 });
        await continueBtn.click();
        await page.waitForTimeout(1000);

        // Step 2: Hours spent
        console.log('Filling Step 2 (Hours)...');
        await page.fill('textarea#fieldpage-2-field-0', '4');
        await page.click('button.cs_button');
        await page.waitForTimeout(1000);

        // Step 3: Efficiency gain
        console.log('Filling Step 3 (Efficiency)...');
        await page.fill('input#fieldpage-3-field-0', '60');
        await page.click('button.cs_button');
        await page.waitForTimeout(1000);

        // Step 4: Employees
        console.log('Filling Step 4 (Employees)...');
        await page.fill('input#fieldpage-4-field-0', '15');
        await page.click('button.cs_button');
        await page.waitForTimeout(1000);

        // Step 5: Monthly Salary
        console.log('Filling Step 5 (Salary)...');
        await page.fill('input#fieldpage-5-field-0', '5000');
        await page.click('button.cs_button');
        await page.waitForTimeout(1000);

        // Step 6: Email
        console.log('Providing Email...');
        await page.fill('input#fieldpage-6-field-0', BOT_EMAIL);
        await page.click('button.cs_button'); // Final Submit
        console.log('Email submission complete.');

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await expect(page.getByText(/Congratulations|Thank you|completed|success/i)).toBeVisible({ timeout: 25000 });
        console.log('Airoi ROI Calculator UI success confirmed.');

        // Verify Email Receipt via IMAP
        const emailSubject = 'ROI Calculation Result';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000); // 10 minute timeout

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Airoi Bot Email Test',
                `The Airoi bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`[SUCCESS] Verified receipt of email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
