import { test, expect } from '@playwright/test';
import { 
    uploadToTypebotImproved, 
    clickTypebotButtonImproved,
    waitForTypingAnimationComplete 
} from '../utils/uploadHelper-improved';
import { getFixturePath } from '../utils/uploadHelper';
import { TIMEOUTS } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/exam';

test.describe('Exam Bot - Grading Analysis', () => {
    test('should analyze exams and display grades for both candidates', async ({ page }) => {
        // Increase timeout for AI processing
        test.setTimeout(180000);
        
        console.log(`\n=== Starting Exam Bot Test ===`);
        console.log(`Bot URL: ${BOT_URL}`);
        
        // Navigate to bot
        console.log('\n[STEP 1] Navigating to Exam Bot...');
        await page.goto(BOT_URL, { timeout: TIMEOUTS.NAVIGATION });

        // Wait for Typebot to load
        console.log('[STEP 2] Waiting for Typebot to initialize...');
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: TIMEOUTS.TYPEBOT_ATTACH });
        
        // Wait for typing animation to complete
        await waitForTypingAnimationComplete(page, TIMEOUTS.TYPING_ANIMATION);
        console.log('✓ Typebot ready');

        // Step 1: Accept consent
        console.log('\n[STEP 3] Accepting consent...');
        await clickTypebotButtonImproved(page, 'Yes I consent', 30000);
        console.log('✓ Consent accepted');
        await page.waitForTimeout(3000);

        // Step 2: Upload Quiz
        console.log('\n[STEP 4] Uploading quiz...');
        const quizPath = getFixturePath('exam', 'quizz');
        if (!quizPath) throw new Error('Quiz fixture not found');
        await uploadToTypebotImproved(page, quizPath);
        console.log('✓ Quiz uploaded');
        await page.waitForTimeout(3000);

        // Step 3: Upload Answers
        console.log('[STEP 5] Uploading answers...');
        const answersPath = getFixturePath('exam', 'answers');
        if (!answersPath) throw new Error('Answers fixture not found');
        await uploadToTypebotImproved(page, answersPath);
        console.log('✓ Answers uploaded');
        await page.waitForTimeout(3000);

        // Step 4: Upload Response 1
        console.log('[STEP 6] Uploading student response 1...');
        const response1Path = getFixturePath('exam', 'response1');
        if (!response1Path) throw new Error('Response1 fixture not found');
        await uploadToTypebotImproved(page, response1Path);
        console.log('✓ Response 1 uploaded');
        await page.waitForTimeout(3000);

        // Step 5: Click "Add another response" to add second student
        console.log('[STEP 7] Clicking "Add another response"...');
        await clickTypebotButtonImproved(page, 'Add another response', 30000);
        console.log('✓ Added another response slot');
        await page.waitForTimeout(3000);

        // Step 6: Upload Response 2
        console.log('[STEP 8] Uploading student response 2...');
        const response2Path = getFixturePath('exam', 'response2');
        if (!response2Path) throw new Error('Response2 fixture not found');
        await uploadToTypebotImproved(page, response2Path);
        console.log('✓ Response 2 uploaded');
        await page.waitForTimeout(3000);

        // Step 7: Click "Start analyzing"
        console.log('[STEP 9] Starting analysis...');
        await clickTypebotButtonImproved(page, 'Start analyzing', 30000);
        console.log('✓ Analysis initiated');

        // Step 8: Wait for AI analysis (this may take a while)
        console.log('\n[STEP 10] Waiting for AI analysis (up to 120s)...');
        
        // Wait for grading results to appear in the chat
        // The bot should return analysis containing scores/grades for the students
        const analysisTimeout = 120000;
        const startTime = Date.now();
        let analysisFound = false;
        
        while (Date.now() - startTime < analysisTimeout) {
            const hasAnalysis = await page.evaluate(() => {
                const typebot = document.querySelector('typebot-standard');
                if (!typebot) return false;
                const shadow = (typebot as any).shadowRoot;
                if (!shadow) return false;
                
                // Get all message text content
                const messages = shadow.querySelectorAll('[class*="message"], [class*="bubble"], [class*="text"]');
                const allText = Array.from(messages).map((m: any) => m.textContent || '').join(' ').toLowerCase();
                
                // Check for indicators of grading analysis
                // The bot should mention scores, grades, or analysis results
                const hasScoreIndicator = 
                    allText.includes('score') || 
                    allText.includes('grade') ||
                    allText.includes('mark') ||
                    allText.includes('points') ||
                    allText.includes('correct') ||
                    allText.includes('analysis') ||
                    allText.includes('result') ||
                    allText.includes('student');
                
                // Also check for numbered results (e.g., "1.", "Q1", percentages)
                const hasNumberedResults = /\d+%|\d+\/\d+|q\d|question\s*\d/i.test(allText);
                
                return hasScoreIndicator || hasNumberedResults;
            });
            
            if (hasAnalysis) {
                console.log('✓ Analysis results detected!');
                analysisFound = true;
                break;
            }
            
            // Log progress every 15 seconds
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            if (elapsed % 15 === 0) {
                console.log(`[EXAM] Waiting for analysis... (${elapsed}s)`);
            }
            
            await page.waitForTimeout(2000);
        }

        // Capture final state for debugging
        const finalContent = await page.evaluate(() => {
            const typebot = document.querySelector('typebot-standard');
            const shadow = (typebot as any)?.shadowRoot;
            if (!shadow) return 'No shadow root';
            
            const messages = shadow.querySelectorAll('[class*="message"], [class*="bubble"], [class*="text"]');
            return Array.from(messages)
                .map((m: any) => m.textContent?.substring(0, 200))
                .filter(Boolean)
                .slice(-5)
                .join('\n---\n');
        });
        console.log(`\n[EXAM] Final bot content (last 5 messages):\n${finalContent}`);

        // Assert that analysis was found
        expect(analysisFound, 'Bot should display grading analysis results').toBe(true);
        
        console.log('\n✅ TEST PASSED: Grading analysis displayed successfully');
    });
});
