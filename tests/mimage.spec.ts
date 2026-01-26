import { test, expect } from '@playwright/test';
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';
import { 
    clickTypebotButton, 
    waitForTypebotReady, 
    waitForUploadArea,
    BUTTON_PATTERNS 
} from '../utils/typebotHelper';

const BOT_URL = 'https://bot.incusservices.com/mimage';

test.describe('Mimage Bot Interaction Flow', () => {
    test('should upload image and receive AI analysis', async ({ page }) => {
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

        // Verify AI Analysis is displayed (no email verification needed)
        // The bot should show analysis text after processing the image
        console.log('Waiting for AI analysis result...');
        await page.waitForFunction(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return false;
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return false;
            const text = shadow.innerText || '';
            return /analysis|finding|result|diagnosis|assessment|report|processed|abnormal|normal/i.test(text);
        }, { timeout: 60000 });
        
        console.log('[SUCCESS] AI analysis displayed - test passed!');
    });
});
