const { test, expect } = require('@playwright/test');

const EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Airoi ROI Calculator Interaction', () => {
    test('Complete ROI Calculation Flow', async ({ page }) => {
        console.log('Navigating to Airoi ROI Calculator...');
        await page.goto('https://go.incusservices.com/airoi');

        // Step 0: Welcome / Continue
        console.log('Starting form...');
        await page.click('button.cs_button');

        // Step 1: Tasks
        console.log('Filling Step 1 (Tasks)...');
        await page.fill('textarea#fieldpage-1-field-0', 'Automating repeated daily operational data entry and reporting.');
        await page.click('button.cs_button');

        // Step 2: Hours spent
        console.log('Filling Step 2 (Hours)...');
        await page.fill('textarea#fieldpage-2-field-0', '4');
        await page.click('button.cs_button');

        // Step 3: Efficiency gain
        console.log('Filling Step 3 (Efficiency)...');
        await page.fill('input#fieldpage-3-field-0', '60');
        await page.click('button.cs_button');

        // Step 4: Employees
        console.log('Filling Step 4 (Employees)...');
        await page.fill('input#fieldpage-4-field-0', '15');
        await page.click('button.cs_button');

        // Step 5: Monthly Salary
        console.log('Filling Step 5 (Salary)...');
        await page.fill('input#fieldpage-5-field-0', '5000');
        await page.click('button.cs_button');

        // Step 6: Email
        console.log('Filling Step 6 (Email)...');
        await page.fill('input#fieldpage-6-field-0', EMAIL);
        await page.click('button.cs_button'); // Final Submit

        // Verify Completion (on-page)
        console.log('Verifying completion message...');
        await expect(page.getByText('Congratulations you have completed!')).toBeVisible({ timeout: 20000 });
        console.log('Airoi ROI Calculator UI success confirmed.');

        // 7. Verify Email Receipt via IMAP
        console.log('Retrieving confirmation email via IMAP...');
        const { waitForEmailConfirmation } = require('./email_imap_util');
        const imapConfig = {
            user: process.env.IMAP_USER || '1677006355115_38182701@zohomail.com',
            password: process.env.IMAP_PASSWORD,
            host: process.env.IMAP_HOST || 'imap.zoho.com',
            port: parseInt(process.env.IMAP_PORT || '993', 10),
            tls: true,
            authTimeout: 3000
        };

        const mail = await waitForEmailConfirmation(imapConfig, 'ROI Calculation Result'); // Adjust subject as needed
        expect(mail).toBeTruthy();
        console.log('Airoi Bot email success confirmed.');
    });
});
