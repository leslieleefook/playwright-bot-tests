import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { 
    uploadToTypebotImproved,
    clickTypebotButtonImproved,
    fillTypebotInputImproved,
    waitForTypingAnimationComplete 
} from '../utils/uploadHelper-improved';
import { getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE, TIMEOUTS } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/match';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Match Bot Flow', () => {
    test('should trigger job match result email', async ({ page }) => {
        console.log(`\n=== Starting Match Bot Test ===`);
        console.log(`Bot URL: ${BOT_URL}`);
        console.log(`Email: ${BOT_EMAIL}`);
        
        // Navigate to bot
        console.log('\n[STEP 1] Navigating to Match Bot...');
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

        // Fill Email if requested (before file uploads)
        console.log('\n[STEP 4] Filling Email...');
        try {
            await fillTypebotInputImproved(page, BOT_EMAIL, 30000);
            await clickTypebotButtonImproved(page, 'Send', 20000);
            console.log('✓ Email submitted');
            await page.waitForTimeout(3000);
        } catch (e) {
            console.log('! No email input at this step, continuing...');
        }

        // Fill Location if requested
        console.log('\n[STEP 5] Filling Location...');
        try {
            await fillTypebotInputImproved(page, 'Main Office Building', 30000);
            await clickTypebotButtonImproved(page, 'Send', 20000);
            console.log('✓ Location submitted');
            await page.waitForTimeout(3000);
        } catch (e) {
            console.log('! No location input at this step, continuing...');
        }

        // Upload JD
        console.log('\n[STEP 6] Uploading Job Description...');
        const jdPath = getFixturePath('match', 'jd');
        if (jdPath) {
            await uploadToTypebotImproved(page, jdPath);
            console.log('✓ Job Description uploaded');
            // Wait for button OR flow to auto-advance
            try {
                await clickTypebotButtonImproved(page, 'Next|Continue|Skip|Send', 15000);
            } catch (e) {
                console.log('! No button needed, flow auto-advanced');
            }
            await page.waitForTimeout(2000);
        }

        // Upload Resume
        console.log('[STEP 7] Uploading Resume...');
        const resPath = getFixturePath('match', 'resume1');
        if (resPath) {
            await uploadToTypebotImproved(page, resPath);
            console.log('✓ Resume uploaded');
            // Wait for button OR flow to auto-advance
            try {
                await clickTypebotButtonImproved(page, 'Analyze|Submit|Next|Continue|Send', 15000);
            } catch (e) {
                console.log('! No button needed, flow auto-advanced');
            }
            await page.waitForTimeout(2000);
        }

        // Verify Completion
        console.log('\n[STEP 8] Verifying analysis completion...');
        await page.waitForTimeout(10000);
        console.log('✓ Match Bot UI stage complete');

        // Verify Email
        const emailSubject = 'Job Match Result';
        console.log(`\n[STEP 9] Waiting for email: "${emailSubject}"...`);
        const mail = await waitForEmailImap(emailSubject, TIMEOUTS.EMAIL_RECEIPT);

        if (!mail) {
            console.error('\n❌ TEST FAILED: Email not received');
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            
            // Save screenshot for debugging
            try {
                await page.screenshot({ path: `test-results/match-failure-${Date.now()}.png`, fullPage: true });
            } catch (e) {
                // Ignore screenshot errors
            }
            
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Match Bot Test',
                `The Match bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        
        console.log(`\n✅ TEST PASSED: Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
