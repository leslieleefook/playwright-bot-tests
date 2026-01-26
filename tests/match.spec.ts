import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { 
    clickTypebotButton, 
    waitForTypebotReady, 
    waitForUploadArea,
    BUTTON_PATTERNS 
} from '../utils/typebotHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/match';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Match Bot Flow', () => {
    test('should trigger job match result email', async ({ page }) => {
        console.log(`Navigating to Match Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to be ready
        await waitForTypebotReady(page, 40000);

        // Click start button
        console.log('Looking for start button...');
        const startClicked = await clickTypebotButton(page, [...BUTTON_PATTERNS.start, ...BUTTON_PATTERNS.consent], 15000);
        if (startClicked) {
            console.log('Clicked start button');
            await page.waitForTimeout(2000);
        } else {
            console.log('No start button found, proceeding...');
        }

        // Wait for upload area to appear
        console.log('Waiting for upload area...');
        await waitForUploadArea(page, 60000);

        // Upload JD
        console.log('Uploading Job Description...');
        const jdPath = getFixturePath('match', 'jd');
        if (jdPath) {
            await uploadToTypebot(page, jdPath);
            console.log('JD uploaded, waiting for next step...');
            
            const nextClicked = await clickTypebotButton(page, [...BUTTON_PATTERNS.next, ...BUTTON_PATTERNS.upload], 30000);
            if (!nextClicked) {
                console.log('No Next button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Wait for next upload area
        await waitForUploadArea(page, 60000);

        // Upload Resume
        console.log('Uploading Resume...');
        const resPath = getFixturePath('match', 'resume1');
        if (resPath) {
            await uploadToTypebot(page, resPath);
            console.log('Resume uploaded, waiting for analysis...');
            
            const analyzeClicked = await clickTypebotButton(page, ['Analyze', 'Match', ...BUTTON_PATTERNS.submit], 30000);
            if (!analyzeClicked) {
                console.log('No analyze button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Verify Completion
        console.log('Verifying analysis completion...');
        await page.waitForFunction(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return false;
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return false;
            const text = shadow.innerText || '';
            return /match.*analysis.*complete|analysis.*complete|completed|thank you|success|results/i.test(text);
        }, { timeout: 30000 });
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
