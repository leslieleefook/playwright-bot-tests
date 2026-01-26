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
 * 
 * Typebot uses a web component with shadow DOM. We need multiple strategies:
 * 1. Wait for shadow DOM content to fully render (not just attached)
 * 2. Playwright's getByLabel() pierces shadow DOM for accessible elements
 * 3. File chooser approach by clicking the dropzone
 * 4. Direct shadow DOM access via evaluate()
 */
export async function uploadToTypebot(page: Page, filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    console.log('[UPLOAD] Attempting Typebot upload...');

    try {
        // Wait for Typebot web component to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 30000 });
        
        // CRITICAL: Wait for ACTUAL upload elements to render (not just CSS)
        // The shadow DOM loads styles first, then chat structure, then upload input
        // We must wait specifically for file-related elements, not just any content
        console.log('[UPLOAD] Waiting for upload elements to render in shadow DOM...');
        await page.waitForFunction(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return false;
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return false;
            
            // ONLY pass when actual upload-related elements are present
            // Don't accept just styles or chat structure - need the file input
            const hasFileInput = shadow.querySelector('input[type="file"]');
            const hasUploadArea = shadow.querySelector('[class*="upload"], [class*="dropzone"], label[for*="file"]');
            const hasDropzoneFile = shadow.querySelector('#dropzone-file');
            const hasUploadLabel = shadow.querySelector('label.typebot-upload-input');
            
            return !!(hasFileInput || hasUploadArea || hasDropzoneFile || hasUploadLabel);
        }, { timeout: 120000 }); // 2 min timeout - bot flow needs time to reach upload step
        
        // Additional small wait for any animations/transitions
        await page.waitForTimeout(1000);
        
        // Debug: Check shadow DOM mode
        const shadowInfo = await page.evaluate(() => {
            const typebot = document.querySelector('typebot-standard');
            if (!typebot) return { exists: false };
            const shadow = (typebot as any).shadowRoot;
            if (!shadow) return { exists: true, hasShadow: false };
            const fileInput = shadow.querySelector('input[type="file"]');
            const uploadArea = shadow.querySelector('[class*="upload"], [class*="dropzone"], label[for*="file"]');
            return {
                exists: true,
                hasShadow: true,
                mode: shadow?.mode || 'no-shadowroot',
                childCount: shadow.children?.length || 0,
                hasFileInput: !!fileInput,
                hasUploadArea: !!uploadArea,
                innerHTML: shadow.innerHTML?.substring(0, 300) || ''
            };
        });
        console.log('[UPLOAD] Shadow DOM info:', JSON.stringify(shadowInfo));

        // Method 1: Use Playwright's getByRole which pierces open shadow DOM
        console.log('[UPLOAD] Trying getByRole for file input...');
        const fileInputByRole = page.getByRole('textbox', { name: /file|upload|drop/i });
        if (await fileInputByRole.count() > 0) {
            console.log('[UPLOAD] Found file input via getByRole');
            await fileInputByRole.setInputFiles(absolutePath);
            console.log('[UPLOAD] File uploaded via getByRole');
            return;
        }

        // Method 2: Use file chooser approach with visible upload area
        // Playwright's text/role selectors pierce shadow DOM
        console.log('[UPLOAD] Trying file chooser approach...');
        
        // Look for upload-related text or buttons that pierce shadow DOM
        const uploadTriggers = [
            page.getByText(/upload|drop.*file|browse|choose.*file/i).first(),
            page.getByRole('button', { name: /upload|browse|choose/i }).first(),
            page.locator('[class*="upload"]').first(),
            page.locator('[class*="dropzone"]').first(),
            page.locator('label[for*="file"]').first(),
        ];

        for (const trigger of uploadTriggers) {
            if (await trigger.count() > 0 && await trigger.isVisible().catch(() => false)) {
                console.log('[UPLOAD] Found upload trigger element, setting up file chooser...');
                try {
                    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 15000 });
                    await trigger.click({ timeout: 5000 });
                    const fileChooser = await fileChooserPromise;
                    await fileChooser.setFiles(absolutePath);
                    console.log('[UPLOAD] File uploaded via file chooser');
                    return;
                } catch (e) {
                    console.log('[UPLOAD] File chooser approach failed for this trigger, trying next...');
                    continue;
                }
            }
        }

        // Method 3: Direct shadow DOM access (works if shadow is open)
        if (shadowInfo.hasShadow) {
            console.log('[UPLOAD] Trying direct shadow DOM access...');
            
            // First scroll the upload area into view if needed
            await page.evaluate(() => {
                const typebot = document.querySelector('typebot-standard');
                const shadow = (typebot as any)?.shadowRoot;
                if (!shadow) return;
                const uploadArea = shadow.querySelector('[class*="upload"], [class*="dropzone"], label[for*="file"]');
                if (uploadArea) {
                    (uploadArea as HTMLElement).scrollIntoView({ behavior: 'instant', block: 'center' });
                }
            });
            await page.waitForTimeout(500);
            
            const fileInputHandle = await page.evaluateHandle(() => {
                const typebot = document.querySelector('typebot-standard');
                const shadow = (typebot as any)?.shadowRoot;
                if (!shadow) return null;
                // Try multiple selectors - be thorough
                return shadow.querySelector('input[type="file"]') ||
                       shadow.querySelector('input#dropzone-file') ||
                       shadow.querySelector('#dropzone-file') ||
                       shadow.querySelector('[id*="file"][type="file"]') ||
                       shadow.querySelector('input.hidden[type="file"]');
            });

            const isValid = await fileInputHandle.evaluate((el: any) => !!el);
            if (isValid) {
                console.log('[UPLOAD] Found file input in shadow DOM');
                await (fileInputHandle as any).setInputFiles(absolutePath);
                console.log('[UPLOAD] File uploaded via shadow DOM');
                await fileInputHandle.dispose();
                return;
            }
            
            // Try clicking label in shadow DOM
            const clicked = await page.evaluate(() => {
                const typebot = document.querySelector('typebot-standard');
                const shadow = (typebot as any)?.shadowRoot;
                if (!shadow) return false;
                const label = shadow.querySelector('label[for*="file"], label[class*="upload"]') as HTMLElement;
                if (label) {
                    label.click();
                    return true;
                }
                return false;
            });

            if (clicked) {
                console.log('[UPLOAD] Clicked shadow DOM label, waiting for file chooser...');
                try {
                    const fileChooser = await page.waitForEvent('filechooser', { timeout: 10000 });
                    await fileChooser.setFiles(absolutePath);
                    console.log('[UPLOAD] File uploaded via shadow label click');
                    return;
                } catch (e) {
                    console.log('[UPLOAD] File chooser not triggered by shadow label');
                }
            }
        }

        // Method 4: Fallback - any file input on page
        console.log('[UPLOAD] Trying standard file input fallback...');
        const standardInput = page.locator('input[type="file"]');
        if (await standardInput.count() > 0) {
            await standardInput.first().setInputFiles(absolutePath);
            console.log('[UPLOAD] File uploaded via standard input');
            return;
        }

        throw new Error('No file upload element found. Shadow info: ' + JSON.stringify(shadowInfo));
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
