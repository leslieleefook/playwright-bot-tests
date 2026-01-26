import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/match';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

/**
 * Shadow-piercing selectors for Typebot web component.
 * Typebot renders inside <typebot-standard> with shadow DOM.
 */
const TYPEBOT = {
    button: (pattern: string) => `typebot-standard >> button:text-matches("${pattern}", "i")`,
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

test.describe('Match Bot Flow', () => {
    test('should trigger job match result email', async ({ page }) => {
        console.log(`Navigating to Match Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(2000); // Allow shadow DOM to render

        // Wait for initial start button
        console.log('Checking for initial bot interaction...');
        const startClicked = await waitForAndClickTypebotButton(page, [
            'Start',
            'Begin',
            'Yes',
            'OK',
            'Continue',
            'Match',
            'Let\'s go'
        ], 15000);
        if (startClicked) {
            console.log('Clicked start button');
            await page.waitForTimeout(2000);
        } else {
            console.log('No initial button found, proceeding with flow...');
        }

        // Upload JD
        console.log('Uploading Job Description...');
        const jdPath = getFixturePath('match', 'jd');
        if (jdPath) {
            await uploadToTypebot(page, jdPath);
            console.log('JD uploaded, waiting for next step...');
            const progressClicked = await waitForAndClickTypebotButton(page, [
                'Next',
                'Continue',
                'Upload',
                'Done',
                'OK'
            ], 45000);
            if (!progressClicked) {
                console.log('No Next button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Upload Resume
        console.log('Uploading Resume...');
        const resPath = getFixturePath('match', 'resume1');
        if (resPath) {
            await uploadToTypebot(page, resPath);
            console.log('Resume uploaded, waiting for analysis...');
            const progressClicked = await waitForAndClickTypebotButton(page, [
                'Analyze',
                'Submit',
                'Match',
                'Next',
                'Continue',
                'Done'
            ], 45000);
            if (!progressClicked) {
                console.log('No analyze button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Verify Completion
        console.log('Verifying analysis completion...');
        await expect(page.getByText(/Match analysis complete/i)).toBeVisible({ timeout: 30000 });
        console.log('Match Bot UI success confirmed.');

        // Verify Email
        const emailSubject = 'Job Match Result';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Match Bot Test',
                `The Match bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
