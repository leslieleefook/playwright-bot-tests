import { Page, Locator } from '@playwright/test';

/**
 * Shadow-piercing selectors for Typebot web component.
 * Typebot renders inside <typebot-standard> with shadow DOM.
 * Use '>>' syntax to pierce shadow boundaries.
 */
export const TypebotSelectors = {
    // Container
    container: 'typebot-standard',
    
    // Inputs (shadow-piercing)
    textInput: 'typebot-standard >> input[type="text"], typebot-standard >> textarea',
    emailInput: 'typebot-standard >> input[type="email"]',
    numberInput: 'typebot-standard >> input[type="number"]',
    fileInput: 'typebot-standard >> input[type="file"]',
    fileInputById: 'typebot-standard >> input#dropzone-file',
    
    // Upload elements
    uploadLabel: 'typebot-standard >> label:has(input[type="file"])',
    uploadDropzone: 'typebot-standard >> .typebot-upload-input',
    
    // Buttons
    button: 'typebot-standard >> button',
    submitButton: 'typebot-standard >> button[type="submit"]',
    
    // Common button patterns
    startButton: (pattern: RegExp) => `typebot-standard >> button:text-matches("${pattern.source}", "i")`,
    continueButton: 'typebot-standard >> button:has-text("Continue")',
    nextButton: 'typebot-standard >> button:has-text("Next")',
    skipButton: 'typebot-standard >> button:has-text("Skip")',
};

/**
 * Helper class for interacting with Typebot forms
 */
export class TypebotHelper {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Wait for Typebot to load and be ready
     */
    async waitForReady(timeout: number = 30000): Promise<void> {
        await this.page.locator(TypebotSelectors.container).waitFor({ 
            state: 'attached', 
            timeout 
        });
        // Give shadow DOM time to render
        await this.page.waitForTimeout(1000);
    }

    /**
     * Click a button by text pattern (case-insensitive)
     */
    async clickButton(textPattern: string | RegExp, timeout: number = 30000): Promise<void> {
        const pattern = typeof textPattern === 'string' ? textPattern : textPattern.source;
        const selector = `typebot-standard >> button:text-matches("${pattern}", "i")`;
        const button = this.page.locator(selector).first();
        await button.waitFor({ state: 'visible', timeout });
        await button.click();
    }

    /**
     * Fill a text input
     */
    async fillText(text: string, timeout: number = 30000): Promise<void> {
        const input = this.page.locator(TypebotSelectors.textInput).first();
        await input.waitFor({ state: 'visible', timeout });
        await input.fill(text);
        await this.page.keyboard.press('Enter');
    }

    /**
     * Fill an email input
     */
    async fillEmail(email: string, timeout: number = 30000): Promise<void> {
        const input = this.page.locator(TypebotSelectors.emailInput).first();
        await input.waitFor({ state: 'visible', timeout });
        await input.fill(email);
        await this.page.keyboard.press('Enter');
    }

    /**
     * Fill a number input
     */
    async fillNumber(value: string | number, timeout: number = 30000): Promise<void> {
        const input = this.page.locator(TypebotSelectors.numberInput).first();
        await input.waitFor({ state: 'visible', timeout });
        await input.fill(String(value));
        await this.page.keyboard.press('Enter');
    }

    /**
     * Get a visible button locator
     */
    getButton(textPattern: string | RegExp): Locator {
        const pattern = typeof textPattern === 'string' ? textPattern : textPattern.source;
        return this.page.locator(`typebot-standard >> button:text-matches("${pattern}", "i")`).first();
    }

    /**
     * Get file input locator (for direct setInputFiles)
     */
    getFileInput(): Locator {
        return this.page.locator(TypebotSelectors.fileInputById).or(
            this.page.locator(TypebotSelectors.fileInput)
        ).first();
    }

    /**
     * Check if text is visible within the Typebot
     */
    async isTextVisible(text: string | RegExp, timeout: number = 10000): Promise<boolean> {
        try {
            const pattern = typeof text === 'string' ? text : text.source;
            const locator = this.page.locator(`typebot-standard >> text=${pattern}`);
            await locator.waitFor({ state: 'visible', timeout });
            return true;
        } catch {
            return false;
        }
    }
}
