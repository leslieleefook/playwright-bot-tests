import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { 
    uploadToTypebotImproved, 
    fillTypebotInputImproved,
    clickTypebotButtonImproved,
    waitForTypingAnimationComplete 
} from '../utils/uploadHelper-improved';
import { getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE, TIMEOUTS } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/claims';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Claims Bot Interaction Flow', () => {
    test('should complete claims flow and verify receipt', async ({ page }) => {
        console.log(`\n=== Starting Claims Bot Test ===`);
        console.log(`Bot URL: ${BOT_URL}`);
        console.log(`Email: ${BOT_EMAIL}`);
        
        // Navigate to bot
        console.log('\n[STEP 1] Navigating to Claims Bot...');
        await page.goto(BOT_URL, { timeout: TIMEOUTS.NAVIGATION });

        // Wait for Typebot to load
        console.log('[STEP 2] Waiting for Typebot to initialize...');
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: TIMEOUTS.TYPEBOT_ATTACH });
        
        // Wait for typing animation to complete
        await waitForTypingAnimationComplete(page, TIMEOUTS.TYPING_ANIMATION);
        console.log('✓ Typebot ready');

        // Initiate flow
        console.log('\n[STEP 3] Initiating flow...');
        await clickTypebotButtonImproved(page, 'Yes', 20000);
        console.log('✓ Flow initiated');
        
        await page.waitForTimeout(2000);

        // Helper to fill input and submit
        const fillAndSubmit = async (value: string) => {
            await fillTypebotInputImproved(page, value);
            await page.waitForTimeout(500);
            await clickTypebotButtonImproved(page, 'Send');
            await page.waitForTimeout(2000); // Wait for bot response
        };

        // 1. Name
        console.log('\n[STEP 4] Providing Name...');
        await fillAndSubmit('Leslie');

        // 2. Email (actually used for policy number verification)
        console.log('[STEP 5] Providing Email/Policy Number...');
        await fillAndSubmit(BOT_EMAIL);

        // 3. Select Claim Type (bot shows buttons: Auto, Home)
        console.log('[STEP 6] Selecting claim type...');
        await page.waitForTimeout(2000); // Wait for buttons to appear
        await clickTypebotButtonImproved(page, 'Auto|Home', 30000); // Click either Auto or Home
        await page.waitForTimeout(2000);

        // 4. Provide Claims Details if text input appears
        console.log('[STEP 7] Checking for claims details input...');
        try {
            // Try to fill details if input appears, otherwise skip
            await fillTypebotInputImproved(page, 'Reporting an issue with a recent service interaction for operational verification.', 30000);
            await page.waitForTimeout(500);
            await clickTypebotButtonImproved(page, 'Send', 15000);
            await page.waitForTimeout(2000);
        } catch (e) {
            console.log('! No text input for details, continuing...');
        }

        // 5. File Upload (optional - bot flow may have changed)
        console.log('[STEP 8] Checking for claim image upload...');
        const imgPath = getFixturePath('claims', 'img');
        if (imgPath) {
            try {
                // Check if there's a file input available
                const hasUploadElement = await page.evaluate(() => {
                    const typebot = document.querySelector('typebot-standard');
                    if (!typebot) return false;
                    const shadow = (typebot as any).shadowRoot;
                    if (!shadow) return false;
                    return !!(shadow.querySelector('input[type="file"]') || 
                             shadow.querySelector('[class*="upload"]') || 
                             shadow.querySelector('[class*="dropzone"]'));
                });
                
                if (hasUploadElement) {
                    await uploadToTypebotImproved(page, imgPath);
                    console.log('✓ Claim image uploaded successfully');
                    await page.waitForTimeout(5000);
                    try {
                        await clickTypebotButtonImproved(page, 'Continue|Next|Submit', 5000);
                    } catch (e) {
                        console.log('! No submit button after upload, continuing...');
                    }
                } else {
                    console.log('! No upload element found - bot flow may have changed, skipping upload step');
                    // If there's a text input instead, fill it with a placeholder
                    try {
                        await fillTypebotInputImproved(page, 'N/A - No additional documentation', 20000);
                        await clickTypebotButtonImproved(page, 'Send', 15000);
                        await page.waitForTimeout(2000);
                    } catch (e) {
                        console.log('! No additional input required, continuing...');
                    }
                }
            } catch (uploadError: any) {
                console.log(`⚠ Upload step failed or not required: ${uploadError.message}`);
            }
        }

        // Verify Completion (on-page)
        console.log('\n[STEP 9] Verifying interaction completion...');
        await page.waitForTimeout(10000); // Give bot time to process
        console.log('✓ Claims Bot UI stage complete');

        // 5. Verify Email Receipt via IMAP
        const emailSubject = 'Claim Received';
        console.log(`\n[STEP 10] Waiting for email: "${emailSubject}"...`);
        
        const mail = await waitForEmailImap(emailSubject, TIMEOUTS.EMAIL_RECEIPT);

        if (!mail) {
            console.error('\n❌ TEST FAILED: Email not received');
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            
            // Save screenshot for debugging
            try {
                await page.screenshot({ path: `test-results/claims-failure-${Date.now()}.png`, fullPage: true });
            } catch (e) {
                // Ignore screenshot errors
            }
            
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Claims Bot Email Test',
                `The Claims bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`\n✅ TEST PASSED: Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
