# Playwright Bot Tests

E2E testing suite for Incus Services chatbots using Playwright.

## Overview

This repository contains automated end-to-end tests for various Typebot-based chatbots. Each test:
1. Navigates to the bot URL
2. Completes the interaction flow (forms, uploads, etc.)
3. Verifies email receipt via IMAP

## Tested Bots

| Bot | URL | Description |
|-----|-----|-------------|
| Airoi | `go.incusservices.com/airoi` | AI ROI Calculator |
| Claims | `bot.incusservices.com/claims` | Claims submission |
| Compliance | `bot.incusservices.com/compliance` | Document compliance check |
| Exam | `bot.incusservices.com/exam` | Exam grading |
| Incident | `bot.incusservices.com/incident` | Incident reporting |
| Match | `bot.incusservices.com/match` | Job matching |
| Mimage | `bot.incusservices.com/mimage` | Image processing |
| MKT | `bot.incusservices.com/mkt` | Product idea submission |
| TDE | `bot.incusservices.com/tde` | Technical delivery excellence |

## Prerequisites

- Node.js 18+
- npm

## Setup

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

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

## Running Tests

### Run all tests
```bash
npm test
```

### Run a specific test
```bash
npx playwright test tests/airoi.spec.ts
```

### Run with UI mode
```bash
npx playwright test --ui
```

### Run headed (visible browser)
```bash
npx playwright test --headed
```

### View test report
```bash
npx playwright show-report
```

## CI/CD

Tests run automatically on:
- Push to `main`/`master`
- Pull requests
- Daily at midnight UTC (scheduled)

### Test Reports

HTML reports are deployed to GitHub Pages after each run.

### Sharding

Tests are distributed across 3 parallel shards for faster execution.

## Project Structure

```
├── tests/              # Test specifications (TypeScript)
├── utils/              # Helper utilities
│   ├── constants.ts    # Environment variables
│   ├── emailHelper.ts  # IMAP/SMTP utilities
│   └── uploadHelper.ts # File upload utilities
├── fixtures/           # Test data (images, documents)
├── directives/         # Documentation and requirements
└── playwright.config.js
```

## Configuration

### Playwright Config

- **Test timeout:** 5 minutes
- **Expect timeout:** 20 seconds
- **Retries:** 2 (CI only)
- **Browser:** Chromium
- **Artifacts:** Screenshots, videos, and traces on failure

### Environment Variables

See `.env.example` for required variables.

## Troubleshooting

### Tests timing out
- Increase `timeout` in `playwright.config.js`
- Check if bot URLs are accessible
- Verify email credentials

### Email verification failing
- Check IMAP credentials
- Ensure email server allows app passwords
- Verify firewall isn't blocking IMAP port

### Upload failures
- Ensure fixture files exist
- Check file permissions
- Verify Typebot upload selectors haven't changed

## Contributing

1. Create a feature branch
2. Make changes with tests
3. Ensure all tests pass locally
4. Submit a pull request

## License

ISC
