import { Page } from '@playwright/test';
import * as path from 'path';

/**
 * Uploads a file to a specified selector.
 * Handles cases where the input might be hidden or requires a file chooser.
 */
export async function uploadFile(
    page: Page,
    selector: string,
    filePath: string,
    isInput: boolean = true
): Promise<void> {
    const absolutePath = path.resolve(filePath);
    console.log(`[UPLOAD] Uploading ${absolutePath} to ${selector}...`);

    if (isInput) {
        // Standard <input type="file">
        await page.setInputFiles(selector, absolutePath);
    } else {
        // Trigger file chooser by clicking an element
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click(selector);
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(absolutePath);
    }
}

/**
 * Specifically for Typebot style uploads which often use a hidden input
 */
export async function uploadToTypebot(page: Page, filePath: string): Promise<void> {
    // Typebot usually has an input[type="file"] hidden somewhere
    // We try to find it specifically within the typebot container
    const inputSelector = 'input[type="file"]';

    try {
        const input = page.locator(inputSelector);
        if (await input.count() > 0) {
            console.log('[UPLOAD] Hidden file input found.');
            await uploadFile(page, inputSelector, filePath, true);
        } else {
            console.log('[UPLOAD] No standard file input found, searching for dropzones...');
            const uploadZone = page.locator('div[aria-label*="upload"], button:has-text("Upload"), .typebot-upload-button').first();
            await uploadFile(page, uploadZone.toString(), filePath, false);
        }
    } catch (err: any) {
        console.error(`[UPLOAD] Failed during Typebot upload attempt: ${err.message}`);
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
