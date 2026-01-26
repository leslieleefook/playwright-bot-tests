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

const BOT_URL = 'https://bot.incusservices.com/incident';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

test.describe('Incident Bot Interaction Flow', () => {
    test('should trigger incident confirmation email and verify receipt', async ({ page }) => {
        console.log(`Navigating to Incident Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to be ready
        await waitForTypebotReady(page, 40000);

        // Click start button (incident bot has "Yes!")
        console.log('Looking for start button...');
        const startClicked = await clickTypebotButton(page, [...BUTTON_PATTERNS.consent, ...BUTTON_PATTERNS.start], 15000);
        if (startClicked) {
            console.log('Clicked start button');
            await page.waitForTimeout(2000);
        } else {
            console.log('No start button found, proceeding...');
        }

        // Wait for upload area to appear
        console.log('Waiting for upload area...');
        await waitForUploadArea(page, 60000);

        // Upload Scene
        console.log('Uploading Incident Scene...');
        const scenePath = getFixturePath('incident', 'scence'); // Preserving user typo 'scence'
        if (scenePath) {
            await uploadToTypebot(page, scenePath);
            console.log('Scene uploaded, waiting for next step...');
            
            const nextClicked = await clickTypebotButton(page, [...BUTTON_PATTERNS.next, ...BUTTON_PATTERNS.submit], 30000);
            if (!nextClicked) {
                console.log('No Next button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Wait for next upload area
        await waitForUploadArea(page, 60000);

        // Upload ID
        console.log('Uploading ID Image...');
        const idPath = getFixturePath('incident', 'id');
        if (idPath) {
            await uploadToTypebot(page, idPath);
            console.log('ID uploaded, waiting for next step...');
            
            const nextClicked = await clickTypebotButton(page, [...BUTTON_PATTERNS.next, ...BUTTON_PATTERNS.submit], 30000);
            if (!nextClicked) {
                console.log('No Next button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Wait for next upload area
        await waitForUploadArea(page, 60000);

        // Upload Documents
        console.log('Uploading Documents...');
        const docsPath = getFixturePath('incident', 'docs');
        if (docsPath) {
            await uploadToTypebot(page, docsPath);
            console.log('Documents uploaded, waiting for submission...');
            
            const submitClicked = await clickTypebotButton(page, BUTTON_PATTERNS.submit, 30000);
            if (!submitClicked) {
                console.log('No submit button found, bot may auto-advance');
            }
            await page.waitForTimeout(2000);
        }

        // Verify Completion
        console.log('Verifying submission completion...');
        await page.waitForFunction(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return false;
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return false;
            const text = shadow.innerText || '';
            return /incident.*submitted|report.*received|completed|thank you|success/i.test(text);
        }, { timeout: 30000 });
        console.log('Incident Bot UI stage complete.');

        // Verify Email
        const emailSubject = 'Incident Confirmation';
        console.log(`Waiting for email with subject: ${emailSubject}...`);
        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: Incident Bot Test',
                `The Incident bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email not found: ${emailSubject}`);
        }
        console.log(`[SUCCESS] Verified email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
