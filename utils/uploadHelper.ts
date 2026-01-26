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
 */
export async function uploadToTypebot(page: Page, filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    console.log(`[UPLOAD] Attempting Typebot upload: ${absolutePath}`);

    try {
        // Typebot uses shadow DOM - the file input is inside typebot-standard shadow root
        // Use Playwright's built-in shadow DOM piercing with >>
        const shadowInput = page.locator('typebot-standard').locator('#dropzone-file');
        
        // Check if shadow DOM input exists
        if (await shadowInput.count() > 0) {
            console.log('[UPLOAD] Found shadow DOM file input');
            await shadowInput.setInputFiles(absolutePath);
            return;
        }

        // Fallback: try regular file input
        const regularInput = page.locator('input[type="file"]');
        if (await regularInput.count() > 0) {
            console.log('[UPLOAD] Found regular file input');
            await regularInput.first().setInputFiles(absolutePath);
            return;
        }

        // Fallback: click upload zone and use file chooser
        console.log('[UPLOAD] Using file chooser fallback');
        const uploadZone = page.locator('text=Click to upload').first();
        const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 30000 });
        await uploadZone.click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(absolutePath);

    } catch (err: any) {
        console.error(`[UPLOAD] Failed: ${err.message}`);
        throw err;
    }
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