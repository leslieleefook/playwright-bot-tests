const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');

const USER_DATA_DIR = path.join(__dirname, '..', '.tmp', 'user_data');

(async () => {
    console.log('Launching browser for manual session refresh...');

    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await context.newPage();
    await page.goto('https://mail.google.com/mail/u/0/#inbox');

    console.log('---------------------------------------------------------');
    console.log('PLEASE LOG IN MANUALLY IN THE OPENED BROWSER WINDOW.');
    console.log('1. Log in to accesssmartwriter3@gmail.com');
    console.log('2. Dismiss the "Smart features" modal if it appears.');
    console.log('3. Once in the inbox, STAY THERE for 15 seconds.');
    console.log('4. Look for "Session data updated" in this terminal.');
    console.log('5. Close the browser window.');
    console.log('---------------------------------------------------------');

    // Monitor for inbox URL and save state aggressively
    const checkInterval = setInterval(async () => {
        if (page.url().includes('mail.google.com/mail/u/0/#inbox')) {
            console.log('Detected Gmail Inbox! Capturing session state...');
            await context.storageState({ path: path.join(__dirname, '..', '.tmp', 'storageState.json') });
            console.log('Session data updated in .tmp/storageState.json');
        }
    }, 5000);

    // Wait for the browser to be closed by the user
    page.on('close', async () => {
        clearInterval(checkInterval);
        console.log('Saving final session state...');
        await context.storageState({ path: path.join(__dirname, '..', '.tmp', 'storageState.json') });
        console.log('Browser closed. Session saved.');
        process.exit(0);
    });

    context.on('close', async () => {
        clearInterval(checkInterval);
        await context.storageState({ path: path.join(__dirname, '..', '.tmp', 'storageState.json') });
        console.log('Context closed. Session saved.');
        process.exit(0);
    });
})();
