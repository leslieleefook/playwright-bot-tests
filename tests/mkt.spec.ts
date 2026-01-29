import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { 
    fillTypebotInputImproved,
    clickTypebotButtonImproved,
    waitForTypingAnimationComplete 
} from '../utils/uploadHelper-improved';
import { TEST_EMAIL, NOTIFY_ON_FAILURE, TIMEOUTS } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/mkt';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('MKT Bot Interaction Flow', () => {
    test('should complete product idea flow and verify receipt', async ({ page }) => {
        console.log(`\n=== Starting MKT Bot Test ===`);
        console.log(`Bot URL: ${BOT_URL}`);
        console.log(`Email: ${BOT_EMAIL}`);
        
        // Navigate to bot
        console.log('\n[STEP 1] Navigating to MKT Bot...');
        await page.goto(BOT_URL, { timeout: TIMEOUTS.NAVIGATION });

        // Wait for Typebot to load
        console.log('[STEP 2] Waiting for Typebot to initialize...');
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: TIMEOUTS.TYPEBOT_ATTACH });
        
        // Wait for typing animation to complete
        await waitForTypingAnimationComplete(page, TIMEOUTS.TYPING_ANIMATION);
        console.log('✓ Typebot ready');

        // Helper to fill input and submit
        const fillAndSubmit = async (value: string, fieldName: string) => {
            console.log(`Filling ${fieldName}...`);
            await page.waitForTimeout(2000); // Wait for typing animation
            await fillTypebotInputImproved(page, value);
            await page.waitForTimeout(500);
            await clickTypebotButtonImproved(page, 'Send', 10000);
            await page.waitForTimeout(3000);
        };

        // Wait for bot to initialize and show the "Yes!" button
        console.log('\n[STEP 3] Initiating flow...');
        await clickTypebotButtonImproved(page, 'Yes!', 30000);
        console.log('✓ Flow initiated');
        await page.waitForTimeout(3000);

        // 1. Name Input
        console.log('\n[STEP 4] Providing Name...');
        await fillAndSubmit('Leslie', 'Name');

        // 2. Email Input
        console.log('[STEP 5] Providing Email...');
        await fillAndSubmit(BOT_EMAIL, 'Email');

        // 3. Product Idea
        console.log('[STEP 6] Providing Product Idea...');
        await fillAndSubmit('Automated AI testing framework for conversion bots', 'Product Idea');

        // Verify Completion (on-page)
        console.log('\n[STEP 7] Verifying completion message...');
        await page.waitForTimeout(10000); // Give bot time to process
        console.log('✓ MKT Bot UI stage complete');

        // 4. Verify Email Receipt via IMAP
        const emailSubject = 'Product Idea Flow';
        console.log(`\n[STEP 8] Waiting for email: "${emailSubject}"...`);

        const mail = await waitForEmailImap(emailSubject, TIMEOUTS.EMAIL_RECEIPT);

        if (!mail) {
            console.error('\n❌ TEST FAILED: Email not received');
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            
            // Save screenshot for debugging
            try {
                await page.screenshot({ path: `test-results/mkt-failure-${Date.now()}.png`, fullPage: true });
            } catch (e) {
                // Ignore screenshot errors
            }
            
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: MKT Bot Email Test',
                `The MKT bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`\n✅ TEST PASSED: Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
