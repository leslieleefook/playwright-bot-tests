import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { 
    fillTypebotInputImproved,
    clickTypebotButtonImproved, 
    uploadToTypebotImproved,
    waitForTypingAnimationComplete
} from '../utils/uploadHelper-improved';
import { getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE, TIMEOUTS } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/incident';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Incident Bot Interaction Flow', () => {
    test('should complete incident report flow and verify receipt', async ({ page }) => {
        console.log(`\n=== Starting Incident Bot Test ===`);
        console.log(`Bot URL: ${BOT_URL}`);
        console.log(`Email: ${BOT_EMAIL}`);
        
        // Navigate to bot
        console.log('\n[STEP 1] Navigating to Incident Bot...');
        await page.goto(BOT_URL, { timeout: TIMEOUTS.NAVIGATION });

        // Wait for Typebot to load
        console.log('[STEP 2] Waiting for Typebot to initialize...');
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: TIMEOUTS.TYPEBOT_ATTACH });
        
        // Wait for typing animation to complete
        await waitForTypingAnimationComplete(page, TIMEOUTS.TYPING_ANIMATION);
        console.log('✓ Typebot ready');

        // Click Yes! button to accept and start flow
        console.log('\n[STEP 3] Clicking Yes! to start...');
        await clickTypebotButtonImproved(page, 'Yes!', 30000);
        console.log('✓ Flow started');
        
        await page.waitForTimeout(3000);

        // Helper to fill input and submit (with longer waits for CI)
        const fillAndSubmit = async (value: string, fieldName: string) => {
            console.log(`Filling ${fieldName}...`);
            await page.waitForTimeout(2000); // Wait for typing animation
            await fillTypebotInputImproved(page, value, 60000); // Explicit timeout for CI
            await page.waitForTimeout(500);
            await clickTypebotButtonImproved(page, 'Send', 30000);
            await page.waitForTimeout(3000);
        };

        // 1. Name
        await fillAndSubmit('John Doe', 'Reporter Name');
        
        // 2. Email
        await fillAndSubmit(BOT_EMAIL, 'Email');
        
        // 3. Bot asks "Who are you reporting on behalf of?" with buttons
        console.log('\n[STEP 4] Selecting reporting behalf...');
        await clickTypebotButtonImproved(page, 'myself', 30000);
        console.log('✓ Selected myself');
        await page.waitForTimeout(3000);

        // 4. File upload for incident scene photo
        console.log('[STEP 5] Uploading incident scene photo...');
        const scenePath = getFixturePath('incident', 'scence');
        if (scenePath) {
            try {
                await uploadToTypebotImproved(page, scenePath);
                console.log('✓ Scene photo uploaded successfully');
                await page.waitForTimeout(2000);
                
                // Try to click continue button if present
                try {
                    await clickTypebotButtonImproved(page, 'Continue|Next|Skip|Send', 15000);
                } catch (e) {
                    console.log('! No continue button needed after upload');
                }
            } catch (e) {
                console.log(`⚠ Scene upload step: ${(e as Error).message}`);
            }
        }

        // 5. Continue with any remaining text fields bot might ask
        const fieldsToTry = [
            { value: 'Main Office Building', name: 'Location' },
            { value: '2026-01-27', name: 'Date of Incident' },
            { value: '10:30 AM', name: 'Time of Incident' },
            { value: 'Slip and fall in hallway due to wet floor', name: 'Description' },
            { value: 'Minor injury - first aid administered', name: 'Injuries/Damage' },
            { value: 'Area was cordoned off and floor dried', name: 'Immediate Actions Taken' }
        ];
        
        for (const field of fieldsToTry) {
            // Check current state
            const state = await page.evaluate(() => {
                const typebot = document.querySelector('typebot-standard');
                if (!typebot) return { hasInput: false, hasButtons: false };
                const shadow = (typebot as any).shadowRoot;
                if (!shadow) return { hasInput: false, hasButtons: false };
                const input = shadow.querySelector('input[type="text"], input[type="email"], textarea');
                const fileInput = shadow.querySelector('input[type="file"]');
                const buttons = Array.from(shadow.querySelectorAll('button')).map((b: any) => b.textContent?.trim()).filter(Boolean);
                return { 
                    hasInput: !!input && !fileInput, 
                    hasFileInput: !!fileInput,
                    buttons,
                    hasButtons: buttons.length > 0 && !buttons.every((b: string) => b === 'Send' || b === 'Stop recording')
                };
            });

            if (state.hasFileInput) {
                // Another upload step
                console.log(`\nFile upload step detected, trying injury photo...`);
                const injuryPath = getFixturePath('incident', 'injury');
                if (injuryPath) {
                    try {
                        await uploadToTypebotImproved(page, injuryPath);
                        console.log('✓ Injury photo uploaded successfully');
                        await page.waitForTimeout(2000);
                        
                        // Try to click continue button if present
                        try {
                            await clickTypebotButtonImproved(page, 'Continue|Next|Skip|Send', 15000);
                        } catch (e) {
                            console.log('! No continue button needed after upload');
                        }
                    } catch (e) {
                        console.log(`⚠ Injury upload: ${(e as Error).message}`);
                    }
                }
                continue;
            }

            if (state.hasButtons) {
                // Click first non-Send button
                console.log(`\nButton step detected: ${state.buttons?.join(', ') || 'no buttons'}`);
                const buttonToClick = state.buttons?.find((b: string) => b !== 'Send' && b !== 'Stop recording');
                if (buttonToClick) {
                    await clickTypebotButtonImproved(page, buttonToClick, 10000);
                    console.log(`✓ Clicked: ${buttonToClick}`);
                    await page.waitForTimeout(2000);
                }
                continue;
            }

            if (state.hasInput) {
                try {
                    await fillAndSubmit(field.value, field.name);
                } catch (e) {
                    console.log(`⚠ Could not fill ${field.name}: ${(e as Error).message}`);
                    break;
                }
            } else {
                console.log(`! No input available for ${field.name}, flow may have ended`);
                break;
            }
        }

        // Verify Completion
        console.log('\n[STEP 6] Verifying incident report completion...');
        await page.waitForTimeout(10000);
        console.log('✓ Incident Bot UI stage complete');

        // Verify Email
        const emailSubject = 'Incident Report';
        console.log(`\n[STEP 7] Waiting for email: "${emailSubject}"...`);
        const mail = await waitForEmailImap(emailSubject, TIMEOUTS.EMAIL_RECEIPT);

        if (!mail) {
            console.error('\n❌ TEST FAILED: Email not received');
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            
            // Save screenshot for debugging
            try {
                await page.screenshot({ path: `test-results/incident-failure-${Date.now()}.png`, fullPage: true });
            } catch (e) {
                // Ignore screenshot errors
            }
            
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Incident Bot Test',
                `The Incident bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        
        console.log(`\n✅ TEST PASSED: Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
