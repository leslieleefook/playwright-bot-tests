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

const BOT_URL = 'https://bot.incusservices.com/exam';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Exam Bot Interaction Flow', () => {
    test('should trigger exam grade email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Exam Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to be ready
        await waitForTypebotReady(page, 40000);

        // Click consent button (exam bot has "Yes I consent")
        console.log('Looking for consent button...');
        const consentClicked = await clickTypebotButton(page, BUTTON_PATTERNS.consent, 15000);
        if (consentClicked) {
            console.log('Clicked consent button');
            await page.waitForTimeout(2000);
        } else {
            console.log('No consent button found, proceeding...');
        }

        // Wait for upload area to appear before attempting upload
        console.log('Waiting for upload area...');
        await waitForUploadArea(page, 60000);

        // Upload Quiz
        console.log('Uploading Quiz...');
        const quizPath = getFixturePath('exam', 'quizz');
        if (quizPath) {
            await uploadToTypebot(page, quizPath);
            console.log('Quiz uploaded, waiting for next step...');
            
            // Wait for next/continue button or next upload area
            const nextClicked = await clickTypebotButton(page, [...BUTTON_PATTERNS.next, ...BUTTON_PATTERNS.submit], 30000);
            if (!nextClicked) {
                console.log('No Next button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Wait for next upload area
        await waitForUploadArea(page, 60000);

        // Upload Answers
        console.log('Uploading Answers...');
        const ansPath = getFixturePath('exam', 'answers');
        if (ansPath) {
            await uploadToTypebot(page, ansPath);
            console.log('Answers uploaded, waiting for next step...');
            
            const nextClicked = await clickTypebotButton(page, [...BUTTON_PATTERNS.next, ...BUTTON_PATTERNS.submit], 30000);
            if (!nextClicked) {
                console.log('No Next button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Wait for next upload area
        await waitForUploadArea(page, 60000);

        // Upload Response 1
        console.log('Uploading Response Image...');
        const res1Path = getFixturePath('exam', 'response1');
        if (res1Path) {
            await uploadToTypebot(page, res1Path);
            console.log('Response uploaded, waiting for submission...');
            
            const submitClicked = await clickTypebotButton(page, BUTTON_PATTERNS.submit, 30000);
            if (!submitClicked) {
                console.log('No submit button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Verify Completion - use evaluate to check shadow DOM
        console.log('Verifying submission completion...');
        await page.waitForFunction(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return false;
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return false;
            const text = shadow.innerText || '';
            return /exam submitted|completed|thank you|success/i.test(text);
        }, { timeout: 30000 });
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
