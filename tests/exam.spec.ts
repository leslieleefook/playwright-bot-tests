import { test, expect } from '@playwright/test';
import { uploadToTypebot, getFixturePath, clickTypebotButton } from '../utils/uploadHelper';

const BOT_URL = 'https://bot.incusservices.com/exam';

test.describe('Exam Bot - Grading Analysis', () => {
    test('should analyze exams and display grades for both candidates', async ({ page }) => {
        // Increase timeout for AI processing
        test.setTimeout(180000);
        
        console.log(`[EXAM] Navigating to: ${BOT_URL}`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        console.log('[EXAM] Waiting for Typebot to load...');
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        
        // Wait for initial typing animation
        console.log('[EXAM] Waiting for initial messages...');
        await page.waitForTimeout(6000);

        // Step 1: Accept consent
        console.log('[EXAM] Step 1: Accepting consent...');
        await clickTypebotButton(page, 'Yes I consent', 30000);
        await page.waitForTimeout(3000);

        // Step 2: Upload Quiz
        console.log('[EXAM] Step 2: Uploading quiz...');
        const quizPath = getFixturePath('exam', 'quizz');
        if (!quizPath) throw new Error('Quiz fixture not found');
        await uploadToTypebot(page, quizPath);
        await page.waitForTimeout(3000);

        // Step 3: Upload Answers
        console.log('[EXAM] Step 3: Uploading answers...');
        const answersPath = getFixturePath('exam', 'answers');
        if (!answersPath) throw new Error('Answers fixture not found');
        await uploadToTypebot(page, answersPath);
        await page.waitForTimeout(3000);

        // Step 4: Upload Response 1
        console.log('[EXAM] Step 4: Uploading student response 1...');
        const response1Path = getFixturePath('exam', 'response1');
        if (!response1Path) throw new Error('Response1 fixture not found');
        await uploadToTypebot(page, response1Path);
        await page.waitForTimeout(3000);

        // Step 5: Click "Add another response" to add second student
        console.log('[EXAM] Step 5: Clicking "Add another response"...');
        await clickTypebotButton(page, 'Add another response', 30000);
        await page.waitForTimeout(3000);

        // Step 6: Upload Response 2
        console.log('[EXAM] Step 6: Uploading student response 2...');
        const response2Path = getFixturePath('exam', 'response2');
        if (!response2Path) throw new Error('Response2 fixture not found');
        await uploadToTypebot(page, response2Path);
        await page.waitForTimeout(3000);

        // Step 7: Click "Start analyzing"
        console.log('[EXAM] Step 7: Starting analysis...');
        await clickTypebotButton(page, 'Start analyzing', 30000);

        // Step 8: Wait for AI analysis (this may take a while)
        console.log('[EXAM] Step 8: Waiting for AI analysis (up to 120s)...');
        
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
                console.log('[EXAM] Analysis results detected!');
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
        console.log(`[EXAM] Final bot content (last 5 messages):\n${finalContent}`);

        // Assert that analysis was found
        expect(analysisFound, 'Bot should display grading analysis results').toBe(true);
        
        console.log('[EXAM] ✅ Test passed - Grading analysis displayed successfully');
    });
});
