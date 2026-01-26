import 'dotenv/config';
export const TEST_EMAIL = process.env.TEST_EMAIL || '';
export const TEST_EMAIL_PASSWORD = process.env.TEST_EMAIL_PASSWORD || '';

// Helper to detect if running in CI without email credentials
export const SKIP_EMAIL_TESTS = !TEST_EMAIL || !TEST_EMAIL_PASSWORD;

export const IMAP_USER = process.env.IMAP_USER || TEST_EMAIL;
export const IMAP_PASSWORD = process.env.IMAP_PASSWORD || TEST_EMAIL_PASSWORD;
export const IMAP_HOST = process.env.IMAP_HOST || 'imap.zoho.com';
export const IMAP_PORT = parseInt(process.env.IMAP_PORT || '993', 10);

export const SMTP_HOST = process.env.SMTP_HOST || 'smtp.zoho.com';
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
export const SMTP_SECURE = process.env.SMTP_SECURE !== 'false'; // Default to true for port 465
export const NOTIFY_ON_FAILURE = process.env.NOTIFY_ON_FAILURE || 'leslieleefook@incusservices.com';
