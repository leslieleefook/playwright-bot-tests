# Contributing to playwright-bot-tests

Thank you for your interest in contributing to the Playwright Bot Tests project! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Writing Tests](#writing-tests)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- Access to test email credentials (contact maintainers)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/leslieleefook/playwright-bot-tests.git
   cd playwright-bot-tests
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install --with-deps
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

---

## Development Setup

### Running Tests Locally

```bash
# Run all tests
npm test

# Run a specific test file
npx playwright test tests/mkt.spec.ts

# Run with UI mode (debugging)
npx playwright test --ui

# Run headed (visible browser)
npx playwright test --headed

# Run with specific project
npx playwright test --project=chromium
```

### Viewing Reports

```bash
# After test run
npx playwright show-report
```

---

## Writing Tests

### Test File Structure

Each bot should have its own test file in `tests/`:

```typescript
import { test, expect } from '@playwright/test';
import { waitForEmailImap, sendEmail } from '../utils/emailHelper';
import { fillTypebotInput, clickTypebotButton } from '../utils/uploadHelper';
import { BOT_EMAIL, NOTIFY_ON_FAILURE, TIMEOUTS } from '../utils/constants';

const BOT_URL = 'https://bot.incusservices.com/your-bot';

test.describe('Your Bot Interaction Flow', () => {
    test('should complete flow and verify receipt', async ({ page }) => {
        // 1. Navigate to bot
        await page.goto(BOT_URL);
        
        // 2. Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ 
            state: 'attached', 
            timeout: TIMEOUTS.TYPEBOT_ATTACH 
        });
        await page.waitForTimeout(TIMEOUTS.TYPING_ANIMATION);
        
        // 3. Interact with bot flow
        // ...
        
        // 4. Verify email receipt
        const mail = await waitForEmailImap('Expected Subject', TIMEOUTS.EMAIL_RECEIPT);
        expect(mail).toBeTruthy();
    });
});
```

### Using Shared Helpers

**Fill and Submit:**
```typescript
import { fillAndSubmitTypebot } from '../utils/uploadHelper';

// Basic usage
await fillAndSubmitTypebot(page, 'John Doe', 'Name');

// With custom options
await fillAndSubmitTypebot(page, 'test@example.com', 'Email', {
    inputTimeout: 30000,
    postWait: 5000
});
```

**Click Buttons:**
```typescript
import { clickTypebotButton } from '../utils/uploadHelper';

// Text match
await clickTypebotButton(page, 'Yes I consent', 30000);

// Regex match
await clickTypebotButton(page, /Continue|Next|Submit/, 30000);
```

**File Uploads:**
```typescript
import { uploadToTypebot, getFixturePath } from '../utils/uploadHelper';

const filePath = getFixturePath('botname', 'img');
if (filePath) {
    await uploadToTypebot(page, filePath);
}
```

### Adding Test Fixtures

Place test files in `fixtures/` with naming convention:
```
{botname}_{step}.{extension}
```

Examples:
- `claims_img.jpg`
- `exam_quizz.docx`
- `match_resume1.pdf`

### Using Constants

Always use constants for configuration:

```typescript
import { BOT_EMAIL, TIMEOUTS, NOTIFY_ON_FAILURE } from '../utils/constants';

// ✅ Good - uses constant
await fillTypebotInput(page, BOT_EMAIL);
await page.waitForTimeout(TIMEOUTS.TYPING_ANIMATION);

// ❌ Bad - hardcoded values
await fillTypebotInput(page, '1677006355115_38182701@zohomail.com');
await page.waitForTimeout(5000);
```

---

## Code Style

### TypeScript Guidelines

- Use TypeScript for all new code
- Add JSDoc comments for exported functions
- Avoid `any` types where possible
- Use const for constants

### Logging

Use consistent logging prefixes:

```typescript
// For bot-specific logs
console.log('[BOTNAME] Step description...');

// For utility logs
console.log('[UPLOAD] File uploaded...');
console.log('[TYPEBOT] Input filled...');
console.log('[IMAP] Email found...');
```

### Error Handling

```typescript
try {
    await uploadToTypebot(page, filePath);
} catch (e) {
    console.log(`[BOTNAME] Upload failed: ${(e as Error).message}`);
    // Decide whether to throw or continue
}
```

---

## Pull Request Process

### Before Submitting

1. **Run tests locally**
   ```bash
   npx playwright test tests/your-test.spec.ts
   ```

2. **Check TypeScript compilation**
   ```bash
   npx tsc --noEmit
   ```

3. **Update documentation** if adding new features

### PR Description Template

```markdown
## What does this PR do?

Brief description of changes.

## Bot(s) Affected

- [ ] airoi
- [ ] claims
- [ ] (etc.)

## Testing Done

- [ ] Tested locally (headed mode)
- [ ] Tested in CI (if applicable)
- [ ] Updated fixtures if needed

## Checklist

- [ ] Code follows project style
- [ ] JSDoc comments added for new functions
- [ ] Constants used instead of hardcoded values
- [ ] Tests pass locally
```

### Review Process

1. Open PR against `main` branch
2. Automated CI tests will run
3. Request review from maintainers
4. Address feedback
5. Merge after approval

---

## Troubleshooting

### Common Issues

**Typebot not loading:**
```typescript
// Increase timeout for slow connections
await page.locator('typebot-standard').waitFor({ 
    state: 'attached', 
    timeout: 60000  // Increased from default
});
```

**Shadow DOM elements not found:**
```typescript
// The >> selector pierces shadow DOM
const input = page.locator('typebot-standard >> input[type="text"]');

// Or use evaluate for direct access
await page.evaluate(() => {
    const typebot = document.querySelector('typebot-standard');
    const shadow = (typebot as any).shadowRoot;
    // Access elements...
});
```

**Email verification failing locally:**
```bash
# Skip email verification for local testing
SKIP_EMAIL_VERIFICATION=true npm test
```

**Upload element not appearing:**
- Check if bot flow has changed
- Use `waitForTypebotButtonOrAdvance` for flows that auto-advance
- Increase `TIMEOUTS.UPLOAD_ELEMENT` if needed

### Getting Help

- Check existing test files for patterns
- Review `utils/uploadHelper.ts` source code
- Open an issue for persistent problems

---

## Questions?

Contact the maintainers or open an issue on GitHub.
