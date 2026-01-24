const { test, expect } = require('@playwright/test');
const path = require('path');

const STORAGE_STATE = path.join(__dirname, '..', '.tmp', 'storageState.json');
const FAILURE_RECIPIENT = 'leslieleefook@incusservices.com';

test.use({
    storageState: STORAGE_STATE,
});

test.describe('Failure Notification', () => {
    test('Send Notification Email', async ({ page }) => {
        const botName = process.env.BOT_NAME || 'Unknown Bot';
        const reason = process.env.FAILURE_REASON || 'The expected email was not received within the required timeframe.';

        console.log(`Sending failure notification for ${botName}...`);

        // Go to Gmail
        await page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'networkidle', timeout: 60000 });

        // Handle potential overlays (e.g., Smart features)
        try {
            console.log('Checking for Gmail overlays...');
            const modal = page.locator('div[role="dialog"]');
            if (await modal.isVisible({ timeout: 5000 })) {
                console.log('Detected modal. Attempting to dismiss...');
                // Click the "Turn off" option by text
                await page.locator('text=Turn off smart features in Workspace').first().click({ force: true }).catch(() => { });
                await page.getByRole('button', { name: 'Next' }).click();
                // Second step if it exists
                await page.getByRole('button', { name: 'Done' }).click().catch(() => { });
                console.log('Dismissed modal.');
            }
        } catch (e) {
            // No modal or different one, proceed
        }

        // Click Compose
        console.log('Clicking Compose...');
        const composeBtn = page.getByRole('button', { name: /Compose/i }).or(page.locator('div[role="button"]:has-text("Compose")')).first();
        await composeBtn.waitFor({ state: 'visible', timeout: 30000 });
        await composeBtn.click();

        // Fill Recipient - using a very broad selector and retrying
        console.log('Filling recipient...');
        const toField = page.locator('div[aria-label="To recipients"], input[name="to"], [aria-label="To"]').first();
        await toField.waitFor({ state: 'visible', timeout: 15000 });
        await toField.click();
        await page.keyboard.type(FAILURE_RECIPIENT);
        await page.keyboard.press('Enter');

        // Fill Subject
        console.log('Filling subject...');
        const subjectField = page.locator('input[name="subjectbox"], [placeholder="Subject"]').first();
        await subjectField.fill(`System Performance Alert: ${botName} Flow Interrupted`);

        // Fill Body
        console.log('Filling body...');
        const timestamp = new Date().toLocaleString();
        const messageBody = `
Operational Monitoring Summary
------------------------------
Source: Automated Monitoring Framework
Timestamp: ${timestamp}
Bot Identifier: ${botName}

Observation:
The standard interaction flow for ${botName} has been interrupted.

Operational Detail: 
${reason}

Instruction:
Please review the system logs or perform a manual verification of the interaction flow.

---
This notification was automatically generated.
`;

        // Try multiple selectors for the body, with a Tab fallback
        const bodyField = page.locator('div[role="textbox"][aria-label="Message Body"], div[aria-label="Message Body"], .Am.Al.editable').first();
        try {
            await bodyField.waitFor({ state: 'visible', timeout: 5000 });
            await bodyField.click();
            await bodyField.fill(messageBody);
        } catch (e) {
            console.log('Body field selector failed, attempting Tab navigation from subject...');
            await subjectField.press('Tab');
            await page.keyboard.type(messageBody);
        }

        // Send
        console.log('Sending message...');
        const sendBtn = page.getByRole('button', { name: 'Send' }).first();
        await sendBtn.click();

        // Wait for send confirmation (Wait for the "Message sent" toast)
        try {
            await page.waitForSelector('text=Message sent', { timeout: 15000 });
            console.log('Notification email successfully dispatched (Detected "Message sent" toast).');
        } catch (e) {
            // Fallback: check if the compose dialog is gone
            if (!(await page.getByRole('dialog', { name: 'New Message' }).isVisible())) {
                console.log('Notification email finished (Compose window closed).');
            } else {
                throw new Error('Failed to confirm email was sent.');
            }
        }
    });
});
