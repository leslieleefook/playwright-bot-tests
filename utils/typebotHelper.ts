import { Page } from '@playwright/test';

/**
 * Typebot Shadow DOM Helper
 * 
 * Typebot renders inside <typebot-standard> with open shadow DOM.
 * Standard Playwright selectors like >> don't properly pierce shadow DOM.
 * This helper uses page.evaluate() to access shadow DOM elements directly.
 */

/**
 * Clicks a button inside Typebot's shadow DOM that matches any of the given patterns.
 * @param page - Playwright Page object
 * @param patterns - Array of text patterns to match (case-insensitive)
 * @param timeout - Maximum time to wait for button to appear (ms)
 * @returns true if a button was clicked, false if timeout
 */
export async function clickTypebotButton(page: Page, patterns: string[], timeout = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        // Use evaluate to access shadow DOM directly
        const clicked = await page.evaluate((textPatterns: string[]) => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return false;
            
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return false;
            
            // Find all buttons in shadow DOM
            const buttons = shadow.querySelectorAll('button');
            
            for (const btn of buttons) {
                const text = btn.textContent?.trim() || '';
                // Check if button text matches any pattern (case-insensitive)
                for (const pattern of textPatterns) {
                    const regex = new RegExp(pattern, 'i');
                    if (regex.test(text)) {
                        // Only click visible buttons
                        const style = window.getComputedStyle(btn);
                        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                            btn.click();
                            return true;
                        }
                    }
                }
            }
            return false;
        }, patterns);
        
        if (clicked) {
            console.log(`[TYPEBOT] Clicked button matching patterns: ${patterns.join(', ')}`);
            return true;
        }
        
        // Wait a bit before retrying
        await page.waitForTimeout(500);
    }
    
    console.log(`[TYPEBOT] No button found matching patterns: ${patterns.join(', ')} (timeout: ${timeout}ms)`);
    return false;
}

/**
 * Waits for Typebot to fully load and be ready for interaction.
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait (ms)
 */
export async function waitForTypebotReady(page: Page, timeout = 40000): Promise<void> {
    console.log('[TYPEBOT] Waiting for Typebot to load...');
    
    // Wait for web component to attach
    await page.locator('typebot-standard').waitFor({ state: 'attached', timeout });
    
    // Wait for shadow DOM to have content (chat loaded)
    await page.waitForFunction(() => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return false;
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return false;
        // Chat has loaded when there's actual content (buttons, text, etc.)
        return shadow.querySelector('button') !== null || shadow.innerText.length > 100;
    }, { timeout });
    
    // Small additional wait for any animations
    await page.waitForTimeout(1000);
    console.log('[TYPEBOT] Typebot ready');
}

/**
 * Checks if an upload area is visible in Typebot's shadow DOM.
 * @param page - Playwright Page object
 * @returns true if upload area is visible
 */
export async function isUploadAreaVisible(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return false;
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return false;
        
        const uploadElements = [
            shadow.querySelector('input[type="file"]'),
            shadow.querySelector('#dropzone-file'),
            shadow.querySelector('[class*="upload"]'),
            shadow.querySelector('[class*="dropzone"]'),
            shadow.querySelector('label[for*="file"]'),
            shadow.querySelector('label.typebot-upload-input'),
        ];
        
        return uploadElements.some(el => {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
    });
}

/**
 * Waits for an upload area to appear in Typebot's shadow DOM.
 * @param page - Playwright Page object
 * @param timeout - Maximum time to wait (ms)
 */
export async function waitForUploadArea(page: Page, timeout = 120000): Promise<void> {
    console.log('[TYPEBOT] Waiting for upload area to appear...');
    
    await page.waitForFunction(() => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return false;
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return false;
        
        // Check for any upload-related elements
        return !!(
            shadow.querySelector('input[type="file"]') ||
            shadow.querySelector('#dropzone-file') ||
            shadow.querySelector('[class*="upload"]') ||
            shadow.querySelector('[class*="dropzone"]') ||
            shadow.querySelector('label[for*="file"]') ||
            shadow.querySelector('label.typebot-upload-input')
        );
    }, { timeout });
    
    console.log('[TYPEBOT] Upload area detected');
    await page.waitForTimeout(500); // Brief wait for stability
}

/**
 * Types text into a Typebot text input field.
 * @param page - Playwright Page object
 * @param text - Text to type
 */
export async function typeInTypebot(page: Page, text: string): Promise<void> {
    // Use evaluate to find and focus the input
    const found = await page.evaluate((inputText: string) => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return false;
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return false;
        
        const input = shadow.querySelector('input[type="text"], textarea, input.typebot-input') as HTMLInputElement;
        if (!input) return false;
        
        input.focus();
        input.value = inputText;
        // Trigger input event
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }, text);
    
    if (!found) {
        throw new Error('Could not find text input in Typebot shadow DOM');
    }
    console.log(`[TYPEBOT] Typed: "${text}"`);
}

/**
 * Common button patterns for different bot stages
 */
export const BUTTON_PATTERNS = {
    consent: ['Yes I consent', 'I consent', 'Yes!', 'Yes', 'Agree', 'Accept'],
    start: ['Start', 'Begin', 'OK', 'Continue', 'Let\'s go', 'Get started'],
    next: ['Next', 'Continue', 'Proceed', 'OK'],
    submit: ['Submit', 'Send', 'Done', 'Finish', 'Complete'],
    upload: ['Upload', 'Browse', 'Choose file', 'Select file'],
};
