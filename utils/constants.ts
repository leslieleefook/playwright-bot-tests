/**
 * @fileoverview Environment configuration and constants for bot tests.
 * 
 * This module centralizes all configuration values, making it easier to
 * manage different environments (local vs CI) and maintain consistency
 * across test files.
 */

import 'dotenv/config';

// ============================================================================
// TEST ACCOUNT CONFIGURATION
// ============================================================================

/** Email account used for test submissions */
export const TEST_EMAIL = process.env.TEST_EMAIL || '';
export const TEST_EMAIL_PASSWORD = process.env.TEST_EMAIL_PASSWORD || '';

/**
 * The email address used by bots when submitting forms.
 * This should be a valid email that can receive confirmation emails.
 * Using Zoho Mail for reliable delivery.
 */
export const BOT_EMAIL = process.env.BOT_EMAIL || '1677006355115_38182701@zohomail.com';

// ============================================================================
// IMAP CONFIGURATION (Email Verification)
// ============================================================================

export const IMAP_USER = process.env.IMAP_USER || TEST_EMAIL;
export const IMAP_PASSWORD = process.env.IMAP_PASSWORD || TEST_EMAIL_PASSWORD;
export const IMAP_HOST = process.env.IMAP_HOST || 'imap.zoho.com';
export const IMAP_PORT = parseInt(process.env.IMAP_PORT || '993', 10);

// ============================================================================
// SMTP CONFIGURATION (Failure Notifications)
// ============================================================================

export const SMTP_HOST = process.env.SMTP_HOST || 'smtp.zoho.com';
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
export const SMTP_SECURE = process.env.SMTP_SECURE !== 'false'; // Default to true for port 465

/** Email to receive test failure notifications */
export const NOTIFY_ON_FAILURE = process.env.NOTIFY_ON_FAILURE || 'leslieleefook@incusservices.com';

// ============================================================================
// CI/TEST ENVIRONMENT FLAGS
// ============================================================================

/**
 * Skip email verification in CI environments where IMAP may not be accessible.
 * Set to 'true' to skip email verification and only test UI flows.
 */
export const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true' || process.env.CI === 'true';

// ============================================================================
// TIMEOUT CONSTANTS
// ============================================================================

/**
 * Centralized timeout values for consistent test behavior.
 * These can be tuned based on CI performance characteristics.
 */
export const TIMEOUTS = {
    /** Wait for Typebot widget to attach to DOM */
    TYPEBOT_ATTACH: 40000,
    
    /** Wait for typing animation to complete */
    TYPING_ANIMATION: 5000,
    
    /** Wait for button to appear after flow step */
    BUTTON_APPEAR: 30000,
    
    /** Wait for input field to be available */
    INPUT_AVAILABLE: 60000,
    
    /** Wait for file upload element */
    UPLOAD_ELEMENT: 90000,
    
    /** Wait for bot to process after action */
    BOT_PROCESSING: 3000,
    
    /** Wait for email via IMAP (10 minutes) */
    EMAIL_RECEIPT: 10 * 60 * 1000,
    
    /** Short delay between actions */
    SHORT_DELAY: 500,
    
    /** Medium delay for animations */
    MEDIUM_DELAY: 2000,
    
    /** Navigation timeout */
    NAVIGATION: 90000,
    
    /** Action timeout (clicks, fills) */
    ACTION: 45000,
} as const;
