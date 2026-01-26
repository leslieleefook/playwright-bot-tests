import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/exam';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

/**
 * Shadow-piercing selectors for Typebot web component.
 * Typebot renders inside <typebot-standard> with shadow DOM.
 * Note: The >> syntax chains locators but for shadow DOM,
 * Playwright's getByRole/getByText naturally pierce open shadow roots.
 */
const TYPEBOT = {
    button: (pattern: string) => `typebot-standard >> button:text-matches("${pattern}", "i")`,
    textInput: 'typebot-standard >> input[type="text"], typebot-standard >> textarea, typebot-standard >> input.typebot-input',
    text: (pattern: string) => `typebot-standard >> text=${pattern}`,
};

/**
 * Waits for any visible button in the Typebot and clicks it if it matches common patterns.
 * Returns true if a button was found and clicked, false otherwise.
 */
async function waitForAndClickTypebotButton(page: any, patterns: string[], timeout = 30000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        for (const pattern of patterns) {
            try {
                const btn = page.locator(TYPEBOT.button(pattern)).first();
                if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await btn.click();
                    return true;
                }
            } catch (e) {
                // Continue trying
            }
        }
        await page.waitForTimeout(500);
    }
    return false;
}

test.describe('Exam Bot Interaction Flow', () => {
    test('should trigger exam grade email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Exam Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(2000); // Allow shadow DOM to render

        // Wait for initial consent/start button - exam bot has "Yes I consent"
        console.log('Checking for initial bot interaction...');
        const consentClicked = await waitForAndClickTypebotButton(page, [
            'Yes I consent',
            'Yes',
            'Start',
            'Begin',
            'OK',
            'Continue',
            'Upload'
        ], 15000);
        if (consentClicked) {
            console.log('Clicked consent/start button');
            await page.waitForTimeout(2000);
        } else {
            console.log('No initial button found, proceeding with flow...');
        }

        // Upload Quiz - wait for upload area to appear first
        console.log('Uploading Quiz...');
        const quizPath = getFixturePath('exam', 'quizz');
        if (quizPath) {
            await uploadToTypebot(page, quizPath);
            console.log('Quiz uploaded, waiting for next step...');
            // Wait for and click any progression button (more flexible pattern)
            const progressClicked = await waitForAndClickTypebotButton(page, [
                'Next',
                'Continue',
                'Submit',
                'Done',
                'OK'
            ], 45000);
            if (!progressClicked) {
                console.log('No Next button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Upload Answers
        console.log('Uploading Answers...');
        const ansPath = getFixturePath('exam', 'answers');
        if (ansPath) {
            await uploadToTypebot(page, ansPath);
            console.log('Answers uploaded, waiting for next step...');
            const progressClicked = await waitForAndClickTypebotButton(page, [
                'Next',
                'Continue',
                'Submit',
                'Done',
                'OK'
            ], 45000);
            if (!progressClicked) {
                console.log('No Next button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Upload Response 1
        console.log('Uploading Response Image...');
        const res1Path = getFixturePath('exam', 'response1');
        if (res1Path) {
            await uploadToTypebot(page, res1Path);
            console.log('Response uploaded, waiting for submission...');
            const progressClicked = await waitForAndClickTypebotButton(page, [
                'Submit',
                'Next',
                'Continue',
                'Done',
                'Finish',
                'Complete'
            ], 45000);
            if (!progressClicked) {
                console.log('No submit button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Verify Completion
        console.log('Verifying submission completion...');
        await expect(page.getByText(/Exam submitted/i)).toBeVisible({ timeout: 30000 });
        console.log('Exam Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Exam Grade';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Exam Bot Test',
                `The Exam bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
