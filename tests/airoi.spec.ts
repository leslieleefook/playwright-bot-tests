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
        await page.waitForTimeout(5000);
        console.log(`Current URL: ${page.url()}`);

        // Handle any modals or overlays that might be blocking the form
        try {
            // Try to dismiss any cookie consent or loading overlays
            const closeButtons = page.locator('button:has-text("Accept"), button:has-text("Close"), button:has-text("Got it")');
            if (await closeButtons.count() > 0) {
                console.log('Dismissing overlay...');
                await closeButtons.first().click();
                await page.waitForTimeout(1000);
            }
        } catch (e) {
            // No overlay to dismiss
        }

        // Step 1: Tasks - Wait for any textarea to be visible first
        console.log('Filling Step 1 (Tasks)...');
        
        // First, try to find any visible textarea/input on the form
        const formContainer = page.locator('.cs_form, form, [class*="form"]').first();
        await formContainer.waitFor({ state: 'visible', timeout: 60000 });
        
        // Now find and fill the textarea
        const textarea = page.locator('textarea').first();
        await textarea.waitFor({ state: 'visible', timeout: 30000 });
        await textarea.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await textarea.fill('Automating repeated daily operational data entry and reporting.');
        
        // Click Continue button
        const continueBtn = page.locator('button.cs_button, button:has-text("Continue")').first();
        await continueBtn.waitFor({ state: 'visible', timeout: 20000 });
        await continueBtn.click();
        await page.waitForTimeout(1000);

        // Helper to fill field and continue
        const fillStepAndContinue = async (value: string, stepName: string) => {
            console.log(`Filling ${stepName}...`);
            // Wait for any input or textarea to be visible
            const input = page.locator('textarea:visible, input:visible').first();
            await input.waitFor({ state: 'visible', timeout: 30000 });
            await input.fill(value);
            await page.waitForTimeout(500);
            
            // Click continue/submit button
            const btn = page.locator('button.cs_button, button:has-text("Continue"), button[type="submit"]').first();
            await btn.click();
            await page.waitForTimeout(2000);
        };

        // Step 2: Hours spent
        await fillStepAndContinue('4', 'Step 2 (Hours)');

        // Step 3: Efficiency gain
        await fillStepAndContinue('60', 'Step 3 (Efficiency)');

        // Step 4: Employees
        await fillStepAndContinue('15', 'Step 4 (Employees)');

        // Step 5: Monthly Salary
        await fillStepAndContinue('5000', 'Step 5 (Salary)');

        // Step 6: Email
        await fillStepAndContinue(BOT_EMAIL, 'Step 6 (Email)');
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
