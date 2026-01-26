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
        
        // IMPORTANT: Wait for Typebot's typing animation to complete before looking for upload elements
        // The bot shows a "typing..." animation and elements render AFTER it completes
        console.log('[UPLOAD] Waiting for typing animation to complete...');
        await page.waitForTimeout(5000); // Initial wait for typing animation
        
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
                const labelForFile = shadow.querySelector('label[for*="file"]');
                
                // Also check for any visible content for debugging
                const buttons = Array.from(shadow.querySelectorAll('button')).map(b => (b as HTMLButtonElement).textContent?.trim());
                const inputs = shadow.querySelectorAll('input').length;
                
                return {
                    hasFileInput: !!fileInput,
                    hasDropzone: !!dropzone,
                    hasDropzoneClass: !!dropzoneClass,
                    hasLabelForFile: !!labelForFile,
                    buttonCount: buttons.length,
                    buttonTexts: buttons.slice(0, 5),
                    inputCount: inputs
                };
            });
            
            if (state.hasFileInput || state.hasDropzone || state.hasDropzoneClass || state.hasLabelForFile) {
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
            
            // Wait for upload to process and flow to potentially auto-advance
            console.log('[UPLOAD] Waiting for upload to process...');
            await page.waitForTimeout(3000);
            return;
        }

        console.log(`[UPLOAD] Shadow DOM check result: ${JSON.stringify(uploaded)}`);

        // Method 2: Try Playwright's >> syntax for shadow-piercing
        // Note: >> only works if shadow DOM is open mode
        const shadowInput = page.locator('typebot-standard >> input[type="file"]');
        if (await shadowInput.count() > 0) {
            console.log('[UPLOAD] Found input via >> selector');
            await shadowInput.first().setInputFiles(absolutePath);
            await page.waitForTimeout(3000);
            return;
        }

        // Method 3: Fallback to regular file inputs outside shadow DOM
        const regularInput = page.locator('input[type="file"]');
        if (await regularInput.count() > 0) {
            console.log('[UPLOAD] Found regular file input');
            await regularInput.first().setInputFiles(absolutePath);
            await page.waitForTimeout(3000);
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
 * Gets button text using multiple strategies (for icon buttons, buttons with child elements, etc.)
 */
function getButtonText(btn: Element): string {
    const htmlBtn = btn as HTMLButtonElement;
    
    // Strategy 1: Direct textContent (trimmed)
    const textContent = htmlBtn.textContent?.trim();
    if (textContent && textContent.length > 0) return textContent;
    
    // Strategy 2: innerText (may differ from textContent)
    const innerText = htmlBtn.innerText?.trim();
    if (innerText && innerText.length > 0) return innerText;
    
    // Strategy 3: aria-label attribute
    const ariaLabel = htmlBtn.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.length > 0) return ariaLabel;
    
    // Strategy 4: title attribute
    const title = htmlBtn.getAttribute('title');
    if (title && title.length > 0) return title;
    
    // Strategy 5: data-testid or data-label
    const dataTestId = htmlBtn.getAttribute('data-testid');
    if (dataTestId && dataTestId.length > 0) return dataTestId;
    
    const dataLabel = htmlBtn.getAttribute('data-label');
    if (dataLabel && dataLabel.length > 0) return dataLabel;
    
    // Strategy 6: Child span/div text
    const childSpan = htmlBtn.querySelector('span, div');
    if (childSpan) {
        const childText = childSpan.textContent?.trim();
        if (childText && childText.length > 0) return childText;
    }
    
    // Strategy 7: SVG icon detection (for icon-only buttons like Send)
    const svg = htmlBtn.querySelector('svg');
    if (svg) {
        // Check for common send icon patterns
        const svgClass = svg.getAttribute('class') || '';
        const path = svg.querySelector('path');
        const pathD = path?.getAttribute('d') || '';
        
        // Common send icon has a specific path pattern (arrow pointing right)
        if (pathD.includes('M2') || pathD.includes('m2') || svgClass.includes('send')) {
            return '[send-icon]';
        }
        return '[icon-button]';
    }
    
    // Strategy 8: Check value attribute (for input type="submit")
    const value = htmlBtn.getAttribute('value');
    if (value && value.length > 0) return value;
    
    return '[empty]';
}

/**
 * Helper to click a button in Typebot's shadow DOM by text pattern.
 * Enhanced to detect icon buttons and buttons with various text sources.
 */
export async function clickTypebotButton(page: Page, pattern: RegExp | string, timeout: number = 30000): Promise<void> {
    const patternStr = pattern instanceof RegExp ? pattern.source : pattern;
    console.log(`[TYPEBOT] Clicking button matching: ${patternStr}`);
    
    // First, log available buttons for debugging with enhanced detection
    const availableButtons = await page.evaluate(() => {
        const typebot = document.querySelector('typebot-standard');
        if (!typebot) return { error: 'no-typebot' };
        const shadow = (typebot as any).shadowRoot;
        if (!shadow) return { error: 'no-shadow' };
        const buttons = shadow.querySelectorAll('button');
        
        return { 
            buttons: Array.from(buttons).map(btn => {
                const htmlBtn = btn as HTMLButtonElement;
                
                // Collect all possible text sources
                const textContent = htmlBtn.textContent?.trim() || '';
                const innerText = htmlBtn.innerText?.trim() || '';
                const ariaLabel = htmlBtn.getAttribute('aria-label') || '';
                const title = htmlBtn.getAttribute('title') || '';
                const dataTestId = htmlBtn.getAttribute('data-testid') || '';
                const childSpan = htmlBtn.querySelector('span, div');
                const childText = childSpan?.textContent?.trim() || '';
                const hasSvg = !!htmlBtn.querySelector('svg');
                
                // Return the best available identifier
                const text = textContent || innerText || ariaLabel || title || dataTestId || childText;
                return text || (hasSvg ? '[icon-button]' : '[empty]');
            })
        };
    });
    console.log(`[TYPEBOT] Available buttons: ${JSON.stringify(availableButtons)}`);
    
    // Wait for button to appear with polling (using enhanced detection)
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
                const htmlBtn = btn as HTMLButtonElement;
                
                // Check all text sources
                const textContent = htmlBtn.textContent?.trim() || '';
                const innerText = htmlBtn.innerText?.trim() || '';
                const ariaLabel = htmlBtn.getAttribute('aria-label') || '';
                const title = htmlBtn.getAttribute('title') || '';
                const dataTestId = htmlBtn.getAttribute('data-testid') || '';
                const childSpan = htmlBtn.querySelector('span, div');
                const childText = childSpan?.textContent?.trim() || '';
                
                // Test against all text sources
                if (regex.test(textContent) || 
                    regex.test(innerText) || 
                    regex.test(ariaLabel) || 
                    regex.test(title) ||
                    regex.test(dataTestId) ||
                    regex.test(childText)) {
                    return true;
                }
                
                // Special case: "Send" pattern should match icon-only send buttons
                if (/send/i.test(pat) && htmlBtn.querySelector('svg')) {
                    // Most likely a send button if it has an SVG and is the submit button
                    const type = htmlBtn.getAttribute('type');
                    if (type === 'submit' || htmlBtn.closest('form')) {
                        return true;
                    }
                }
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
            return Array.from(shadow.querySelectorAll('button')).map(btn => {
                const htmlBtn = btn as HTMLButtonElement;
                const textContent = htmlBtn.textContent?.trim() || '';
                const innerText = htmlBtn.innerText?.trim() || '';
                const ariaLabel = htmlBtn.getAttribute('aria-label') || '';
                const hasSvg = !!htmlBtn.querySelector('svg');
                return { textContent, innerText, ariaLabel, hasSvg };
            });
        });
        console.log(`[TYPEBOT] Final buttons available: ${JSON.stringify(finalButtons)}`);
        throw new Error(`Button matching "${patternStr}" not found after ${timeout}ms. Available: ${JSON.stringify(finalButtons)}`);
    }

    // Click the button using enhanced detection
    await page.evaluate((pat) => {
        const typebot = document.querySelector('typebot-standard');
        const shadow = (typebot as any)?.shadowRoot;
        if (!shadow) throw new Error('No shadow root');
        const buttons = shadow.querySelectorAll('button');
        const regex = new RegExp(pat, 'i');
        
        for (const btn of buttons) {
            const htmlBtn = btn as HTMLButtonElement;
            
            // Check all text sources
            const textContent = htmlBtn.textContent?.trim() || '';
            const innerText = htmlBtn.innerText?.trim() || '';
            const ariaLabel = htmlBtn.getAttribute('aria-label') || '';
            const title = htmlBtn.getAttribute('title') || '';
            const dataTestId = htmlBtn.getAttribute('data-testid') || '';
            const childSpan = htmlBtn.querySelector('span, div');
            const childText = childSpan?.textContent?.trim() || '';
            
            // Test against all text sources
            if (regex.test(textContent) || 
                regex.test(innerText) || 
                regex.test(ariaLabel) || 
                regex.test(title) ||
                regex.test(dataTestId) ||
                regex.test(childText)) {
                htmlBtn.click();
                return;
            }
            
            // Special case: "Send" pattern should match icon-only send buttons
            if (/send/i.test(pat) && htmlBtn.querySelector('svg')) {
                const type = htmlBtn.getAttribute('type');
                if (type === 'submit' || htmlBtn.closest('form')) {
                    htmlBtn.click();
                    return;
                }
            }
        }
        throw new Error('Button not found');
    }, patternStr);
    
    console.log('[TYPEBOT] Button clicked');
}

/**
 * Waits for Typebot flow to advance (either button appears or flow auto-advances).
 * Returns true if a matching button was found and clicked, false if flow auto-advanced.
 */
export async function waitForTypebotButtonOrAdvance(
    page: Page, 
    pattern: RegExp | string, 
    timeout: number = 30000
): Promise<boolean> {
    const patternStr = pattern instanceof RegExp ? pattern.source : pattern;
    console.log(`[TYPEBOT] Waiting for button "${patternStr}" or flow advance...`);
    
    const startTime = Date.now();
    const checkInterval = 1000;
    let lastButtonCount = 0;
    let stableCount = 0;
    
    while (Date.now() - startTime < timeout) {
        const state = await page.evaluate((pat) => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return { error: 'no-typebot', buttonCount: 0, hasMatch: false };
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return { error: 'no-shadow', buttonCount: 0, hasMatch: false };
            
            const buttons = shadow.querySelectorAll('button');
            const regex = new RegExp(pat, 'i');
            let hasMatch = false;
            
            for (const btn of buttons) {
                const htmlBtn = btn as HTMLButtonElement;
                const textContent = htmlBtn.textContent?.trim() || '';
                const innerText = htmlBtn.innerText?.trim() || '';
                const ariaLabel = htmlBtn.getAttribute('aria-label') || '';
                
                if (regex.test(textContent) || regex.test(innerText) || regex.test(ariaLabel)) {
                    hasMatch = true;
                    break;
                }
            }
            
            // Check for upload success indicators (flow advanced)
            const hasUploadedFile = !!shadow.querySelector('[class*="uploaded"], [class*="file-preview"], [class*="success"]');
            const hasNextInput = !!shadow.querySelector('input[type="text"]:not([value]), textarea:not(:disabled)');
            
            return { 
                buttonCount: buttons.length, 
                hasMatch,
                hasUploadedFile,
                hasNextInput
            };
        }, patternStr);
        
        if (state.hasMatch) {
            console.log('[TYPEBOT] Found matching button, clicking...');
            await clickTypebotButton(page, pattern, 5000);
            return true;
        }
        
        // If flow has advanced (new input appeared or upload indicator visible), no button needed
        if (state.hasUploadedFile || state.hasNextInput) {
            console.log('[TYPEBOT] Flow appears to have auto-advanced');
            return false;
        }
        
        // Detect if UI is stable (no button for us, might have auto-advanced)
        if (state.buttonCount === lastButtonCount) {
            stableCount++;
            if (stableCount >= 5) {
                console.log('[TYPEBOT] UI stable with no matching button - assuming auto-advance');
                return false;
            }
        } else {
            stableCount = 0;
        }
        lastButtonCount = state.buttonCount;
        
        await page.waitForTimeout(checkInterval);
    }
    
    console.log(`[TYPEBOT] Timeout waiting for button or advance - proceeding anyway`);
    return false;
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
