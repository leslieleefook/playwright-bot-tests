import { Page, Locator } from '@playwright/test';
import * as path from 'path';

/**
 * Uploads a file to a specified selector or locator.
 */
export async function uploadFile(
    page: Page,
    selector: string | Locator,
    filePath: string,
    isInput: boolean = true
): Promise<void> {
    const absolutePath = path.resolve(filePath);
    const locator = typeof selector === 'string' ? page.locator(selector) : selector;

    console.log(`[UPLOAD] Uploading ${absolutePath}...`);

    if (isInput) {
        await locator.setInputFiles(absolutePath);
    } else {
        const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 30000 });
        await locator.click({ timeout: 30000 });
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(absolutePath);
    }
}

/**
 * Specifically for Typebot style uploads - handles shadow DOM.
 * 
 * IMPORTANT: Typebot renders inside a web component with shadow DOM.
 * The >> selector syntax pierces shadow DOM boundaries.
 * .locator() chain does NOT pierce shadow DOM - you must use >> at the start.
 */
export async function uploadToTypebot(page: Page, filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    console.log(`[UPLOAD] Attempting Typebot upload: ${absolutePath}`);

    try {
        // Wait for Typebot to be present
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 30000 });
        
        // Wait for shadow DOM content to render (upload elements may take time to appear in flow)
        console.log('[UPLOAD] Waiting for upload elements in shadow DOM...');
        
        // Poll for upload elements with debugging
        const uploadTimeout = 60000;
        const startTime = Date.now();
        let uploadElementFound = false;
        
        while (Date.now() - startTime < uploadTimeout) {
            const state = await page.evaluate(() => {
                const typebot = document.querySelector('typebot-standard');
                if (!typebot) return { error: 'no-typebot' };
                const shadow = (typebot as any).shadowRoot;
                if (!shadow) return { error: 'no-shadow' };
                
                // Check for upload elements
                const fileInput = shadow.querySelector('input[type="file"]');
                const dropzone = shadow.querySelector('#dropzone-file');
                const dropzoneClass = shadow.querySelector('[class*="dropzone"]');
                
                // Also check for any visible content for debugging
                const buttons = Array.from(shadow.querySelectorAll('button')).map(b => (b as HTMLButtonElement).textContent?.trim());
                const inputs = shadow.querySelectorAll('input').length;
                
                return {
                    hasFileInput: !!fileInput,
                    hasDropzone: !!dropzone,
                    hasDropzoneClass: !!dropzoneClass,
                    buttonCount: buttons.length,
                    buttonTexts: buttons.slice(0, 5),
                    inputCount: inputs
                };
            });
            
            if (state.hasFileInput || state.hasDropzone || state.hasDropzoneClass) {
                console.log(`[UPLOAD] Found upload element: ${JSON.stringify(state)}`);
                uploadElementFound = true;
                break;
            }
            
            // Log progress every 5 seconds
            if ((Date.now() - startTime) % 5000 < 500) {
                console.log(`[UPLOAD] Waiting... Current state: ${JSON.stringify(state)}`);
            }
            
            await page.waitForTimeout(500);
        }
        
        if (!uploadElementFound) {
            const finalState = await page.evaluate(() => {
                const typebot = document.querySelector('typebot-standard');
                const shadow = (typebot as any)?.shadowRoot;
                if (!shadow) return { error: 'no-shadow' };
                return {
                    html: shadow.innerHTML?.substring(0, 500),
                    buttons: Array.from(shadow.querySelectorAll('button')).map(b => (b as HTMLButtonElement).textContent?.trim())
                };
            });
            console.log(`[UPLOAD] Upload element not found. Final state: ${JSON.stringify(finalState)}`);
            throw new Error(`Upload element not found after ${uploadTimeout}ms`);
        }

        // Method 1: Direct shadow DOM access via JavaScript (most reliable)
        console.log('[UPLOAD] Using direct shadow DOM access...');
        const uploaded = await page.evaluate(async (filePath) => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return { success: false, reason: 'no-typebot' };
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return { success: false, reason: 'no-shadow' };
            
            const fileInput = shadow.querySelector('input[type="file"]') || 
                             shadow.querySelector('#dropzone-file');
            if (!fileInput) return { success: false, reason: 'no-input' };
            
            return { success: true, inputFound: true };
        }, absolutePath);

        if (uploaded.success) {
            // Get the file input handle and set files
            const fileInputHandle = await page.evaluateHandle(() => {
                const typebot = document.querySelector('typebot-standard');
                const shadow = (typebot as any)?.shadowRoot;
                return shadow?.querySelector('input[type="file"]') || shadow?.querySelector('#dropzone-file');
            });
            
            await (fileInputHandle as any).setInputFiles(absolutePath);
            console.log('[UPLOAD] File uploaded via shadow DOM');
            await fileInputHandle.dispose();
            return;
        }

        console.log(`[UPLOAD] Shadow DOM check result: ${JSON.stringify(uploaded)}`);

        // Method 2: Try Playwright's >> syntax for shadow-piercing
        // Note: >> only works if shadow DOM is open mode
        const shadowInput = page.locator('typebot-standard >> input[type="file"]');
        if (await shadowInput.count() > 0) {
            console.log('[UPLOAD] Found input via >> selector');
            await shadowInput.first().setInputFiles(absolutePath);
            return;
        }

        // Method 3: Fallback to regular file inputs outside shadow DOM
        const regularInput = page.locator('input[type="file"]');
        if (await regularInput.count() > 0) {
            console.log('[UPLOAD] Found regular file input');
            await regularInput.first().setInputFiles(absolutePath);
            return;
        }

        throw new Error('No file upload element found in shadow DOM or page');

    } catch (err: any) {
        console.error(`[UPLOAD] Failed: ${err.message}`);
        throw err;
    }
}

/**
 * Helper to fill a text input in Typebot's shadow DOM.
 * Handles the shadow DOM boundary using evaluate().
 */
export async function fillTypebotInput(page: Page, value: string, timeout: number = 30000): Promise<void> {
    console.log(`[TYPEBOT] Filling input with: ${value.substring(0, 20)}...`);
    
    // Wait for input to appear in shadow DOM
    await page.waitForFunction(() => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return false;
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return false;
        const input = shadow.querySelector('input[type="text"], textarea, input:not([type="file"]):not([type="hidden"])');
        return !!input;
    }, { timeout });

    // Fill the input via evaluate
    await page.evaluate((val) => {
        const typebot = document.querySelector('typebot-standard');
        const shadow = (typebot as any)?.shadowRoot;
        if (!shadow) throw new Error('No shadow root');
        const input = shadow.querySelector('input[type="text"], textarea, input:not([type="file"]):not([type="hidden"])') as HTMLInputElement;
        if (!input) throw new Error('No input found');
        input.focus();
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    
    console.log('[TYPEBOT] Input filled');
}

/**
 * Helper to click a button in Typebot's shadow DOM by text pattern.
 */
export async function clickTypebotButton(page: Page, pattern: RegExp | string, timeout: number = 30000): Promise<void> {
    const patternStr = pattern instanceof RegExp ? pattern.source : pattern;
    console.log(`[TYPEBOT] Clicking button matching: ${patternStr}`);
    
    // First, log available buttons for debugging
    const availableButtons = await page.evaluate(() => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return { error: 'no-typebot' };
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return { error: 'no-shadow' };
        const buttons = shadow.querySelectorAll('button');
        return { buttons: Array.from(buttons).map(b => (b as HTMLButtonElement).textContent?.trim() || '[empty]') };
    });
    console.log(`[TYPEBOT] Available buttons: ${JSON.stringify(availableButtons)}`);
    
    // Wait for button to appear with polling
    const startTime = Date.now();
    let found = false;
    
    while (Date.now() - startTime < timeout) {
        found = await page.evaluate((pat) => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return false;
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return false;
            const buttons = shadow.querySelectorAll('button');
            const regex = new RegExp(pat, 'i');
            for (const btn of buttons) {
                if (regex.test(btn.textContent || '')) return true;
            }
            return false;
        }, patternStr);
        
        if (found) break;
        await page.waitForTimeout(500);
    }
    
    if (!found) {
        // Log final state for debugging
        const finalButtons = await page.evaluate(() => {
            const typebot = document.querySelector('typebot-standard');
            const shadow = (typebot as any)?.shadowRoot;
            if (!shadow) return [];
            return Array.from(shadow.querySelectorAll('button')).map(b => (b as HTMLButtonElement).textContent?.trim() || '[empty]');
        });
        console.log(`[TYPEBOT] Final buttons available: ${JSON.stringify(finalButtons)}`);
        throw new Error(`Button matching "${patternStr}" not found after ${timeout}ms. Available: ${JSON.stringify(finalButtons)}`);
    }

    // Click the button
    await page.evaluate((pat) => {
        const typebot = document.querySelector('typebot-standard');
        const shadow = (typebot as any)?.shadowRoot;
        if (!shadow) throw new Error('No shadow root');
        const buttons = shadow.querySelectorAll('button');
        const regex = new RegExp(pat, 'i');
        for (const btn of buttons) {
            if (regex.test(btn.textContent || '')) {
                (btn as HTMLButtonElement).click();
                return;
            }
        }
        throw new Error('Button not found');
    }, patternStr);
    
    console.log('[TYPEBOT] Button clicked');
}

/**
 * Resolves a fixture path based on bot name and step/description.
 */
export function getFixturePath(botName: string, step: string): string {
    const baseDir = './fixtures';
    const fs = require('fs');
    const pathModule = require('path');

    if (!fs.existsSync(baseDir)) return '';

    const files = fs.readdirSync(baseDir);
    const prefix = `${botName}_${step}.`.toLowerCase();

    const match = files.find((f: string) => f.toLowerCase().startsWith(prefix));

    if (match) {
        return pathModule.join(baseDir, match);
    }

    // Fallback search
    const legacyPrefix = `${botName}_`.toLowerCase();
    const legacyMatch = files.find((f: string) => 
        f.toLowerCase().startsWith(legacyPrefix) && f.toLowerCase().includes(step.toLowerCase())
    );

    if (legacyMatch) {
        return pathModule.join(baseDir, legacyMatch);
    }

    return '';
}