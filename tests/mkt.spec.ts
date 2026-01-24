import { test, expect } from '@playwright/test';
import { waitForEmailImap } from '../utils/emailHelper';
import { TEST_EMAIL } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/mkt';

test.describe('MKT Bot Email Flow', () => {
    test('should trigger email and verify receipt', async ({ page }) => {
        await page.goto(BOT_URL);
        // TODO: Add interactions that trigger email generation
        await page.waitForTimeout(2000);

        const emailSubject = 'MKT Bot Test Email';
        const mail = await waitForEmailImap(emailSubject);

        expect(mail).toBeTruthy();
        console.log(`Verified receipt of email: ${mail.subject}`);
    });
});
