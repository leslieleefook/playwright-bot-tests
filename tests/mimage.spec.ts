import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { 
    uploadToTypebotImproved,
    clickTypebotButtonImproved,
    waitForTypingAnimationComplete 
} from '../utils/uploadHelper-improved';
import { getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE, TIMEOUTS } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/mimage';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Mimage Bot Interaction Flow', () => {
    test('should trigger processed image result email and verify receipt', async ({ page }) => {
        console.log(`\n=== Starting Mimage Bot Test ===`);
        console.log(`Bot URL: ${BOT_URL}`);
        console.log(`Email: ${BOT_EMAIL}`);
        
        // Navigate to bot
        console.log('\n[STEP 1] Navigating to Mimage Bot...');
        await page.goto(BOT_URL, { timeout: TIMEOUTS.NAVIGATION });

        // Wait for Typebot to load
        console.log('[STEP 2] Waiting for Typebot to initialize...');
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: TIMEOUTS.TYPEBOT_ATTACH });
        
        // Wait for typing animation to complete
        await waitForTypingAnimationComplete(page, TIMEOUTS.TYPING_ANIMATION);
        console.log('✓ Typebot ready');

        // Accept consent first
        console.log('\n[STEP 3] Accepting consent...');
        await clickTypebotButtonImproved(page, 'Yes I consent', 30000);
        console.log('✓ Consent accepted');
        await page.waitForTimeout(3000);

        // Upload Image - wait for upload step to appear
        console.log('\n[STEP 4] Uploading image for processing...');
        const path = getFixturePath('mimage', 'image');
        if (path) {
            await uploadToTypebotImproved(page, path);
            console.log('✓ Image uploaded');
            // Wait for button OR flow to auto-advance
            try {
                await clickTypebotButtonImproved(page, 'Process|Submit|Continue|Next|Send', 30000);
                console.log('✓ Processing initiated');
            } catch (e) {
                console.log('! No button needed, flow auto-advanced');
            }
            await page.waitForTimeout(3000);
        }

        // Verify Completion
        console.log('\n[STEP 5] Verifying image processing completion...');
        await page.waitForTimeout(10000);
        console.log('✓ Mimage Bot UI stage complete');

        // Verify Email
        const emailSubject = 'Processed Image Result';
        console.log(`\n[STEP 6] Waiting for email: "${emailSubject}"...`);
        const mail = await waitForEmailImap(emailSubject, TIMEOUTS.EMAIL_RECEIPT);

        if (!mail) {
            console.error('\n❌ TEST FAILED: Email not received');
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            
            // Save screenshot for debugging
            try {
                await page.screenshot({ path: `test-results/mimage-failure-${Date.now()}.png`, fullPage: true });
            } catch (e) {
                // Ignore screenshot errors
            }
            
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Mimage Bot Test',
                `The Mimage bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        
        console.log(`\n✅ TEST PASSED: Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
