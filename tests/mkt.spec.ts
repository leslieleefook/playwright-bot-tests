import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { 
    clickTypebotButton, 
    waitForTypebotReady, 
    BUTTON_PATTERNS 
} from '../utils/typebotHelper';
import { TEST_EMAIL, NOTIFY_ON_FAILURE } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/mkt';
const BOT_EMAIL = '1677006355115_38182701@zohomail.com';

/**
 * Fills a text input in Typebot shadow DOM
 */
async function fillTypebotInput(page: any, text: string, type: 'text' | 'email' = 'text'): Promise<void> {
    const filled = await page.evaluate((args: { text: string, type: string }) => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return false;
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return false;
        
        let input: HTMLInputElement | null = null;
        if (args.type === 'email') {
            input = shadow.querySelector('input[type="email"]') as HTMLInputElement;
        } else {
            input = shadow.querySelector('input[type="text"], textarea, input.typebot-input') as HTMLInputElement;
        }
        
        if (!input) return false;
        
        const style = window.getComputedStyle(input);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        
        input.focus();
        input.value = args.text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }, { text, type });
    
    if (!filled) {
        throw new Error(`Could not find ${type} input in Typebot shadow DOM`);
    }
    console.log(`[TYPEBOT] Filled ${type} input: "${text}"`);
}

/**
 * Waits for a text input to appear in Typebot shadow DOM
 */
async function waitForTypebotInput(page: any, type: 'text' | 'email' = 'text', timeout = 30000): Promise<void> {
    await page.waitForFunction((inputType: string) => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return false;
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return false;
        
        let input: HTMLElement | null = null;
        if (inputType === 'email') {
            input = shadow.querySelector('input[type="email"]');
        } else {
            input = shadow.querySelector('input[type="text"], textarea, input.typebot-input');
        }
        
        if (!input) return false;
        const style = window.getComputedStyle(input);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }, type, { timeout });
}

test.describe('MKT Bot Interaction Flow', () => {
    test('should complete product idea flow and verify receipt', async ({ page }) => {
        console.log(`Navigating to MKT Bot: ${BOT_URL}...`);
        await page.goto(BOT_URL);

        // Wait for Typebot to be ready
        await waitForTypebotReady(page, 40000);

        // Wait for bot to initialize and click Yes
        console.log('Looking for Yes button...');
        const startClicked = await clickTypebotButton(page, BUTTON_PATTERNS.consent, 40000);
        if (startClicked) {
            console.log('Clicked Yes button');
            await page.waitForTimeout(2000);
        }

        // 1. Name Input
        console.log('Waiting for name input...');
        await waitForTypebotInput(page, 'text', 30000);
        await fillTypebotInput(page, 'Leslie', 'text');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // 2. Email Input
        console.log('Waiting for email input...');
        await waitForTypebotInput(page, 'email', 30000);
        await fillTypebotInput(page, BOT_EMAIL, 'email');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // 3. Product Idea
        console.log('Waiting for idea input...');
        await waitForTypebotInput(page, 'text', 30000);
        await fillTypebotInput(page, 'Automated AI testing framework for conversion bots', 'text');
        await page.keyboard.press('Enter');

        // Verify Completion
        console.log('Verifying completion message...');
        await page.waitForFunction(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return false;
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return false;
            const text = shadow.innerText || '';
            return /congratulations|idea.*being worked|thank you|success|submitted/i.test(text);
        }, { timeout: 45000 });
        console.log('MKT Bot UI success confirmed.');

        // 4. Verify Email Receipt via IMAP
        const emailSubject = 'Product Idea Flow';
        console.log(`Waiting for email with subject: ${emailSubject}...`);

        const mail = await waitForEmailImap(emailSubject, 10 * 60 * 1000);

        if (!mail) {
            console.log(`[FAIL] Email not received. Sending notification to ${NOTIFY_ON_FAILURE}...`);
            await sendEmail(
                NOTIFY_ON_FAILURE,
                'FAILED: MKT Bot Email Test',
                `The MKT bot test failed to generate a "${emailSubject}" email for ${BOT_EMAIL} within the timeout period.`
            );
            throw new Error(`Email with subject "${emailSubject}" not found.`);
        }

        console.log(`[SUCCESS] Verified receipt of email: ${mail.subject}`);
        expect(mail).toBeTruthy();
    });
});
