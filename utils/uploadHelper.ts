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
 * Specifically for Typebot style uploads.
 * Uses evaluate() to access file input inside <typebot-standard> shadow DOM.
 * 
 * The >> selector syntax does NOT pierce shadow DOM in Playwright.
 * We must use evaluate() to access shadow root directly.
 */
export async function uploadToTypebot(page: Page, filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    console.log('[UPLOAD] Attempting Typebot shadow DOM upload...');

    try {
        // Wait for Typebot web component to be in DOM
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 30000 });
        await page.waitForTimeout(2000); // Allow shadow DOM to fully render

        // Method 1: Try to find file input inside shadow DOM using evaluate
        const hasFileInput = await page.evaluate(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot?.shadowRoot) return false;
            const input = typebot.shadowRoot.querySelector('input[type="file"]');
            return !!input;
        });

        if (hasFileInput) {
            console.log('[UPLOAD] Found file input in Typebot shadow DOM');
            
            // Get element handle to the file input
            const fileInputHandle = await page.evaluateHandle(() => {
                const typebot = document.querySelector('typebot-standard');
                return typebot?.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
            });

            // setInputFiles works with ElementHandle
            await (fileInputHandle as any).setInputFiles(absolutePath);
            console.log('[UPLOAD] File uploaded via shadow DOM input');
            await fileInputHandle.dispose();
            return;
        }

        // Method 2: Click the visible label/dropzone and use file chooser
        const hasUploadLabel = await page.evaluate(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot?.shadowRoot) return false;
            const label = typebot.shadowRoot.querySelector('label.typebot-upload-input, label[for="dropzone-file"]');
            return !!label;
        });

        if (hasUploadLabel) {
            console.log('[UPLOAD] Found upload label, using click + file chooser...');
            
            // Set up file chooser listener BEFORE clicking
            const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 30000 });
            
            // Click the label via evaluate
            await page.evaluate(() => {
                const typebot = document.querySelector('typebot-standard');
                const label = typebot?.shadowRoot?.querySelector('label.typebot-upload-input, label[for="dropzone-file"]') as HTMLElement;
                label?.click();
            });
            
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(absolutePath);
            console.log('[UPLOAD] File uploaded via file chooser');
            return;
        }

        // Method 3: Fallback for non-Typebot pages (standard file input)
        console.log('[UPLOAD] No Typebot elements found, trying standard selectors...');
        const standardInput = page.locator('input[type="file"]');
        if (await standardInput.count() > 0) {
            await standardInput.first().setInputFiles(absolutePath);
            console.log('[UPLOAD] File uploaded via standard input');
            return;
        }

        throw new Error('No file upload element found in shadow DOM or standard DOM');
    } catch (err: any) {
        console.error(`[UPLOAD] Upload failed: ${err.message}`);
        throw err;
    }
}

/**
 * Resolves a fixture path based on bot name and step/description.
 * Example: getFixturePath('compliance', 'id') -> './fixtures/compliance_id.jpg'
 */
export function getFixturePath(botName: string, step: string): string {
    const baseDir = './fixtures';
    const fs = require('fs');
    const path = require('path');

    // List files in fixtures to find a match
    if (!fs.existsSync(baseDir)) return '';

    const files = fs.readdirSync(baseDir);
    const prefix = `${botName}_${step}.`.toLowerCase();

    const match = files.find((f: string) => f.toLowerCase().startsWith(prefix));

    if (match) {
        return path.join(baseDir, match);
    }

    // Fallback search: just botName_type (legacy)
    const legacyPrefix = `${botName}_`.toLowerCase();
    const legacyMatch = files.find((f: string) => f.toLowerCase().startsWith(legacyPrefix) && f.toLowerCase().includes(step.toLowerCase()));

    if (legacyMatch) {
        return path.join(baseDir, legacyMatch);
    }

    return '';
}
