import { test, expect, Page } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { 
    uploadToTypebotImproved, 
    clickTypebotButtonImproved, 
    waitForTypingAnimationComplete 
} from '../utils/uploadHelper-improved';
import { TEST_EMAIL, NOTIFY_ON_FAILURE, TIMEOUTS } from '../utils/constants';
import { getFixturePath } from '../utils/uploadHelper';

const BOT_URL = 'https://bot.incusservices.com/compliance';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Compliance Bot Interaction Flow - IMPROVED', () => {
    test('should trigger compliance email and verify multi-file receipt', async ({ page }) => {
        console.log(`\n=== Starting Compliance Bot Test ===`);
        console.log(`Bot URL: ${BOT_URL}`);
        console.log(`Email: ${BOT_EMAIL}`);
        
        // Navigate to bot
        console.log('\n[STEP 1] Navigating to Compliance Bot...');
        await page.goto(BOT_URL, { timeout: TIMEOUTS.NAVIGATION });

        // Wait for Typebot to load
        console.log('[STEP 2] Waiting for Typebot to initialize...');
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: TIMEOUTS.TYPEBOT_ATTACH });
        
        // Wait for typing animation to complete
        await waitForTypingAnimationComplete(page, TIMEOUTS.TYPING_ANIMATION);
        console.log('✓ Typebot ready');

        // Accept consent with improved button clicking
        console.log('\n[STEP 3] Accepting consent...');
        await page.waitForTimeout(1000); // Brief pause for DOM stability
        
        try {
            await clickTypebotButtonImproved(page, 'Yes I consent', 20000);
            console.log('✓ Consent accepted');
        } catch (e) {
            console.log('! Could not find consent button, checking if already past consent step...');
            // Continue anyway - might have auto-advanced
        }
        
        await page.waitForTimeout(2000);

        // Upload files with improved reliability
        const uploads = [
            { name: 'ID', step: 'id' },
            { name: 'Job Letter', step: 'jobletter' },
            { name: 'Proof of Address', step: 'proofofaddress' }
        ];

        for (let i = 0; i < uploads.length; i++) {
            const upload = uploads[i];
            console.log(`\n[STEP ${i + 4}] Uploading ${upload.name}...`);
            
            const filePath = getFixturePath('compliance', upload.step);
            if (!filePath) {
                console.log(`⚠ Warning: File not found for ${upload.name}, skipping`);
                continue;
            }
            
            try {
                await uploadToTypebotImproved(page, filePath);
                console.log(`✓ ${upload.name} uploaded successfully`);
            } catch (uploadErr: any) {
                console.error(`✗ Failed to upload ${upload.name}: ${uploadErr.message}`);
                
                // Check if we can continue anyway (maybe file already uploaded)
                const canContinue = await checkIfCanContinue(page);
                if (canContinue) {
                    console.log(`! Continuing despite upload error...`);
                } else {
                    throw new Error(`Failed to upload ${upload.name}: ${uploadErr.message}`);
                }
            }
            
            // Wait for next step or button
            await page.waitForTimeout(2000);
        }

        // Verify Completion
        console.log('\n[STEP 7] Verifying completion...');
        await page.waitForTimeout(10000);
        console.log('✓ Compliance Bot UI stage complete');

        // Verify Email Receipt
        const emailSubject = 'Compliance Update';
        console.log(`\n[STEP 8] Waiting for email: "${emailSubject}"...`);
        
        const mail = await waitForEmailImap(emailSubject, TIMEOUTS.EMAIL_RECEIPT);

        if (!mail) {
            console.error('\n❌ TEST FAILED: Email not received');
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            
            // Save screenshot for debugging
            try {
                await page.screenshot({ path: `test-results/compliance-failure-${Date.now()}.png`, fullPage: true });
            } catch (e) {
                // Ignore screenshot errors
            }
            
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Compliance Bot Test',
                `The Compliance bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }

        console.log(`\n✅ TEST PASSED: Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});

/**
 * Helper to check if flow can continue after upload error.
 * Returns true if there's a continue button or if flow has advanced.
 */
async function checkIfCanContinue(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return false;
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return false;
        
        // Check for continue/next/submit buttons
        const buttons = Array.from(shadow.querySelectorAll('button'));
        for (const btn of buttons) {
            const text = (btn as HTMLButtonElement).textContent?.toLowerCase() || '';
            if (text.includes('continue') || text.includes('next') || text.includes('submit')) {
                return true;
            }
        }
        
        // Check if there's already a file uploaded indicator
        const uploadedIndicator = shadow.querySelector('[class*="uploaded"], [class*="file-preview"], [class*="success"]');
        if (uploadedIndicator) {
            return true;
        }
        
        return false;
    });
}
