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
 * Shadow-piercing selectors for Typebot file uploads.
 * Typebot renders inside <typebot-standard> web component with shadow DOM.
 */
const TYPEBOT_FILE_SELECTORS = {
    // Primary: The actual file input (hidden)
    fileInputById: 'typebot-standard >> input#dropzone-file',
    // Fallback: Generic file input
    fileInput: 'typebot-standard >> input[type="file"]',
    // For clicking: The visible label/dropzone
    uploadLabel: 'typebot-standard >> label:has(input[type="file"])',
    // Alternative dropzone selector
    uploadDropzone: 'typebot-standard >> .typebot-upload-input',
};

/**
 * Specifically for Typebot style uploads.
 * Uses shadow-piercing selectors to access elements inside <typebot-standard>.
 */
export async function uploadToTypebot(page: Page, filePath: string): Promise<void> {
    console.log('[UPLOAD] Attempting Typebot upload with shadow-piercing selectors...');

    try {
        // Wait for Typebot to be ready
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 30000 });
        await page.waitForTimeout(1000); // Allow shadow DOM to render

        // Try the specific file input first (by ID)
        const fileInputById = page.locator(TYPEBOT_FILE_SELECTORS.fileInputById);
        if (await fileInputById.count() > 0) {
            console.log('[UPLOAD] Found file input by ID (dropzone-file)');
            await uploadFile(page, fileInputById, filePath, true);
            return;
        }

        // Try generic file input selector
        const fileInput = page.locator(TYPEBOT_FILE_SELECTORS.fileInput);
        if (await fileInput.count() > 0) {
            console.log('[UPLOAD] Found generic file input');
            await uploadFile(page, fileInput, filePath, true);
            return;
        }

        // Fallback: Click the upload label/dropzone and use file chooser
        console.log('[UPLOAD] No direct file input found, trying click-based upload...');
        
        const uploadLabel = page.locator(TYPEBOT_FILE_SELECTORS.uploadLabel);
        const uploadDropzone = page.locator(TYPEBOT_FILE_SELECTORS.uploadDropzone);
        
        const clickTarget = await uploadLabel.count() > 0 ? uploadLabel : uploadDropzone;
        
        if (await clickTarget.count() > 0) {
            console.log('[UPLOAD] Found upload zone, triggering file chooser...');
            await uploadFile(page, clickTarget.first(), filePath, false);
            return;
        }

        // Last resort: Try non-shadow selectors (for non-Typebot pages)
        console.log('[UPLOAD] No Typebot upload elements found, trying standard selectors...');
        const standardInput = page.locator('input[type="file"]');
        if (await standardInput.count() > 0) {
            await uploadFile(page, standardInput.first(), filePath, true);
            return;
        }

        throw new Error('No file upload element found (tried shadow-piercing and standard selectors)');
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
