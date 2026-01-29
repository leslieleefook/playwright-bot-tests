import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { 
    fillTypebotInputImproved,
    clickTypebotButtonImproved,
    waitForTypingAnimationComplete 
} from '../utils/uploadHelper-improved';
import { TEST_EMAIL, NOTIFY_ON_FAILURE, TIMEOUTS } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/employeeexit';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Employee Exit Bot Interaction Flow', () => {
    test('should complete exit interview flow and verify receipt', async ({ page }) => {
        console.log(`\n=== Starting Employee Exit Bot Test ===`);
        console.log(`Bot URL: ${BOT_URL}`);
        console.log(`Email: ${BOT_EMAIL}`);
        
        // Navigate to bot
        console.log('\n[STEP 1] Navigating to Employee Exit Bot...');
        await page.goto(BOT_URL, { timeout: TIMEOUTS.NAVIGATION });

        // Wait for Typebot to load
        console.log('[STEP 2] Waiting for Typebot to initialize...');
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: TIMEOUTS.TYPEBOT_ATTACH });
        
        // Wait for typing animation to complete
        await waitForTypingAnimationComplete(page, TIMEOUTS.TYPING_ANIMATION);
        console.log('✓ Typebot ready');

        // Click Ready button to start the flow
        console.log('\n[STEP 3] Clicking Ready to start...');
        await clickTypebotButtonImproved(page, 'Ready', 30000);
        console.log('✓ Flow initiated');
        await page.waitForTimeout(3000);

        // Helper to fill input and submit with better error handling
        const fillAndSubmit = async (value: string, fieldName: string): Promise<boolean> => {
            console.log(`Filling ${fieldName}...`);
            await page.waitForTimeout(3000); // Wait for typing animation
            
            // Check current state - input, buttons, or end of flow
            const state = await page.evaluate(() => {
                const typebot = document.querySelector('typebot-standard');
                if (!typebot) return { hasInput: false, buttons: [], hasEnd: false };
                const shadow = (typebot as any).shadowRoot;
                if (!shadow) return { hasInput: false, buttons: [], hasEnd: false };
                
                const input = shadow.querySelector('input[type="text"], input[type="email"], textarea');
                const buttons = Array.from(shadow.querySelectorAll('button')).map((b: any) => b.textContent?.trim());
                const hasEnd = buttons.includes('Repeat') || buttons.includes('Exit') || buttons.includes('Restart');
                
                return { hasInput: !!input, buttons, hasEnd };
            });
            
            console.log(`[${fieldName}] State: hasInput=${state.hasInput}, buttons=${state.buttons.join(',')}, hasEnd=${state.hasEnd}`);
            
            // If we've reached end of flow (Repeat/Exit buttons), stop
            if (state.hasEnd) {
                console.log(`Flow ended - detected end buttons: ${state.buttons.join(', ')}`);
                return false;
            }
            
            // If there's no input but there are buttons, try clicking appropriate button
            if (!state.hasInput && state.buttons.length > 0) {
                const nonControlButtons = state.buttons.filter((b: string) => 
                    b && !['Send', 'Stop recording', 'Repeat', 'Exit'].includes(b)
                );
                if (nonControlButtons.length > 0) {
                    console.log(`No input, clicking button: ${nonControlButtons[0]}`);
                    await clickTypebotButtonImproved(page, nonControlButtons[0], 10000);
                    await page.waitForTimeout(2000);
                    return true;
                }
            }
            
            // If there's an input, fill it
            if (state.hasInput) {
                try {
                    await fillTypebotInputImproved(page, value, 60000);
                    await page.waitForTimeout(500);
                    await clickTypebotButtonImproved(page, 'Send', 30000);
                    await page.waitForTimeout(3000);
                    return true;
                } catch (e: any) {
                    console.log(`Failed to fill ${fieldName}: ${e.message}`);
                    return false;
                }
            }
            
            return true;
        };

        // The bot uses text inputs for interview questions
        // Fill in sample responses, but handle flow changes gracefully
        const fields = [
            { value: 'John Doe', name: 'Name' },
            { value: BOT_EMAIL, name: 'Email' },
            { value: 'Software Developer', name: 'Position' },
            { value: 'Engineering', name: 'Department' },
            { value: 'Better career opportunity', name: 'Reason for leaving' },
            { value: 'Great team and learning environment', name: 'What did you enjoy most' },
            { value: 'Work-life balance could improve', name: 'Areas for improvement' },
            { value: 'Yes, would recommend', name: 'Would you recommend company' }
        ];

        for (const field of fields) {
            const success = await fillAndSubmit(field.value, field.name);
            if (!success) {
                console.log(`Flow ended after ${field.name}`);
                break;
            }
        }

        // Verify Completion - Check final bot state
        console.log('\n[STEP 4] Verifying interview completion...');
        await page.waitForTimeout(5000);
        
        // Get final bot content to verify something happened
        const finalState = await page.evaluate(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return { content: '', buttons: [] };
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return { content: '', buttons: [] };
            
            const messages = Array.from(shadow.querySelectorAll('[class*="bubble"], [class*="message"]'))
                .map((m: any) => m.textContent?.trim())
                .filter(Boolean)
                .slice(-5); // Last 5 messages
            const buttons = Array.from(shadow.querySelectorAll('button'))
                .map((b: any) => b.textContent?.trim());
            
            return { content: messages.join(' | '), buttons };
        });
        
        console.log(`Final state: ${JSON.stringify(finalState)}`);
        console.log('✓ Employee Exit Bot UI stage complete');

        // Verify Email - with reduced timeout since flow may have ended early
        const emailSubject = 'Exit Feedback';
        console.log(`\n[STEP 5] Waiting for email: "${emailSubject}"...`);
        const mail = await waitForEmailImap(emailSubject, 5 * 60 * 1000); // 5 min timeout

        if (!mail) {
            // Check if we at least got through the bot flow
            const botCompleted = finalState.buttons.some((b: string) => 
                b?.includes('Repeat') || b?.includes('Exit') || b?.includes('Restart')
            ) || finalState.content.toLowerCase().includes('thank') || finalState.content.toLowerCase().includes('complete');
            
            if (botCompleted) {
                console.log('[WARNING] Bot flow completed but email not received - may be external service issue');
                // Don't send failure notification for email issues if bot flow worked
            } else {
                console.error('\n❌ TEST FAILED: Email not received and bot flow did not complete');
                console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
                
                // Save screenshot for debugging
                try {
                    await page.screenshot({ path: `test-results/employeeexit-failure-${Date.now()}.png`, fullPage: true });
                } catch (e) {
                    // Ignore screenshot errors
                }
                
                await sendEmail(
                    NOTIFY_ON_FAILURE,
                    'FAILED: Employee Exit Bot Test',
                    `The Employee Exit bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
                );
            }
            throw new Error(`Email not found: ${emailSubject}`);
        }
        
        console.log(`\n✅ TEST PASSED: Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
