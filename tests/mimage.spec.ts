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

const BOT_URL = 'https://bot.incusservices.com/mimage';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Mimage Bot Interaction Flow', () => {
    test('should trigger processed image result email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Mimage Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to be ready
        await waitForTypebotReady(page, 40000);

        // Click start button if present
        console.log('Looking for start button...');
        const startClicked = await clickTypebotButton(page, [...BUTTON_PATTERNS.start, ...BUTTON_PATTERNS.upload, ...BUTTON_PATTERNS.consent], 15000);
        if (startClicked) {
            console.log('Clicked start button');
            await page.waitForTimeout(2000);
        } else {
            console.log('No start button found, bot may start directly with upload...');
        }

        // Wait for upload area to appear
        console.log('Waiting for upload area...');
        await waitForUploadArea(page, 60000);

        // Upload Image
        console.log('Uploading image for processing...');
        const path = getFixturePath('mimage', 'image');
        if (path) {
            await uploadToTypebot(page, path);
            console.log('Image uploaded, waiting for processing...');
            
            const processClicked = await clickTypebotButton(page, ['Process', ...BUTTON_PATTERNS.submit, ...BUTTON_PATTERNS.next], 30000);
            if (!processClicked) {
                console.log('No process button found, bot may auto-advance');
            }
            await page.waitForTimeout(3000);
        }

        // Verify Completion
        console.log('Verifying image processing completion...');
        await page.waitForFunction(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return false;
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return false;
            const text = shadow.innerText || '';
            return /image.*processed|processing.*complete|completed|thank you|success/i.test(text);
        }, { timeout: 30000 });
        console.log('Mimage Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Processed Image Result';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Mimage Bot Test',
                `The Mimage bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
