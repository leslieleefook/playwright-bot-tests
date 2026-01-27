import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { fillTypebotInput, clickTypebotButton } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/incident';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Incident Bot Interaction Flow', () => {
    test('should complete incident report flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to Incident Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        
        // Wait for typing animation to complete
        console.log('Waiting for typing animation to complete...');
        await page.waitForTimeout(5000);

        // Click Yes! button to accept and start the flow
        console.log('Clicking Yes! to start...');
        await clickTypebotButton(page, 'Yes!', 30000);
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

        // The bot now uses text inputs for incident details
        // Fill in sample responses for the incident report
        await fillAndSubmit('John Doe', 'Reporter Name');
        await fillAndSubmit(BOT_EMAIL, 'Email');
        await fillAndSubmit('Main Office Building', 'Location');
        await fillAndSubmit('2026-01-27', 'Date of Incident');
        await fillAndSubmit('10:30 AM', 'Time of Incident');
        await fillAndSubmit('Slip and fall in hallway due to wet floor', 'Description');
        await fillAndSubmit('Minor injury - first aid administered', 'Injuries/Damage');
        await fillAndSubmit('Area was cordoned off and floor dried', 'Immediate Actions Taken');

        // Verify Completion
        console.log('Verifying incident report completion...');
        await page.waitForTimeout(10000);
        console.log('Incident Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Incident Report';
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
