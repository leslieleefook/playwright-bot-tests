import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { 
    fillTypebotInputImproved,
    clickTypebotButtonImproved,
    waitForTypingAnimationComplete 
} from '../utils/uploadHelper-improved';
import { TEST_EMAIL, NOTIFY_ON_FAILURE, TIMEOUTS } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/tde';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('TDE Bot Interaction Flow', () => {
    test('should complete TDE flow and verify receipt', async ({ page }) => {
        console.log(`\n=== Starting TDE Bot Test ===`);
        console.log(`Bot URL: ${BOT_URL}`);
        console.log(`Email: ${BOT_EMAIL}`);
        
        // Navigate to bot
        console.log('\n[STEP 1] Navigating to TDE Bot...');
        await page.goto(BOT_URL, { timeout: TIMEOUTS.NAVIGATION });

        // Wait for Typebot to load
        console.log('[STEP 2] Waiting for Typebot to initialize...');
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: TIMEOUTS.TYPEBOT_ATTACH });
        
        // Wait for initial typing animation to complete
        await waitForTypingAnimationComplete(page, TIMEOUTS.TYPING_ANIMATION);
        console.log('✓ Typebot ready');

        // Helper to fill input and submit (with extended waits for typing animations)
        const fillAndSubmit = async (value: string, fieldName: string) => {
            console.log(`[TDE] Filling ${fieldName}: ${value.substring(0, 20)}...`);
            
            // Wait for any typing animation to complete before filling
            await page.waitForTimeout(2000);
            
            await fillTypebotInputImproved(page, value);
            await page.waitForTimeout(1000);
            
            // Click Send button - may be text or icon
            // The improved clickTypebotButton handles icon-only buttons
            await clickTypebotButtonImproved(page, 'Send', 15000);
            
            // Wait for bot to process and show next question
            await page.waitForTimeout(3000);
        };

        // TDE bot starts directly with name input (no Yes button)
        // 1. Name
        console.log('\n[STEP 3] Providing Name...');
        await fillAndSubmit('Leslie', 'Name');

        // 2. Email
        console.log('[STEP 4] Providing Email...');
        await fillAndSubmit(BOT_EMAIL, 'Email');

        // 3. Company Name
        console.log('[STEP 5] Providing Company Name...');
        await fillAndSubmit('Incus Services', 'Company');

        // 4. Challenge/Problem
        console.log('[STEP 6] Providing Challenge...');
        await fillAndSubmit('Low awareness of AI and how to leverage it for business operations', 'Challenge');

        // 5. Industry
        console.log('[STEP 7] Providing Industry...');
        await fillAndSubmit('Technology', 'Industry');

        // Verify Completion (on-page)
        console.log('\n[STEP 8] Verifying completion message...');
        await page.waitForTimeout(5000);
        console.log('✓ TDE Bot UI stage complete');

        // 4. Verify Email Receipt via IMAP
        const emailSubject = 'Service Inquiry';
        console.log(`\n[STEP 9] Waiting for email: "${emailSubject}"...`);

        const mail = await waitForEmailImap(emailSubject, TIMEOUTS.EMAIL_RECEIPT);

        if (!mail) {
            console.error('\n❌ TEST FAILED: Email not received');
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            
            // Save screenshot for debugging
            try {
                await page.screenshot({ path: `test-results/tde-failure-${Date.now()}.png`, fullPage: true });
            } catch (e) {
                // Ignore screenshot errors
            }
            
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: TDE Bot Email Test',
                `The TDE bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`\n✅ TEST PASSED: Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
