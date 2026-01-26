import { Page } from '@playwright/test';
const imaps = require('imap-simple');
import { simpleParser } from 'mailparser';
import { IMAP_USER, IMAP_PASSWORD, IMAP_HOST, IMAP_PORT, SMTP_HOST, SMTP_PORT, SMTP_SECURE } from './constants';
import nodemailer from 'nodemailer';

/**
 * Checks if email credentials are configured.
 * Returns true if IMAP_USER and IMAP_PASSWORD are set, false otherwise.
 */
export function hasEmailCredentials(): boolean {
    return Boolean(IMAP_USER && IMAP_PASSWORD);
}

/**
 * Connects to IMAP and waits for an email with the given subject.
 * Returns the parsed email object if found, or null if timeout.
 * Returns { skipped: true } if credentials are not configured (for CI environments).
 */
export async function waitForEmailImap(subject: string, timeoutMs: number = 10 * 60 * 1000): Promise<any | null> {
    // Gracefully skip email verification if credentials are not configured
    if (!hasEmailCredentials()) {
        console.warn('[IMAP] ⚠️  Email credentials not configured. Skipping email verification.');
        console.warn('[IMAP] Set TEST_EMAIL and TEST_EMAIL_PASSWORD environment variables to enable email tests.');
        return { skipped: true, reason: 'credentials_missing' };
    }
    const config = {
        imap: {
            user: IMAP_USER,
            password: IMAP_PASSWORD,
            host: IMAP_HOST,
            port: IMAP_PORT,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 3000
        }
    };

    console.log(`[IMAP] Connecting to ${IMAP_HOST} for user ${IMAP_USER}...`);
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        try {
            const connection = await imaps.connect(config);
            await connection.openBox('INBOX');

            // Search for unread emails with the specific subject
            // Note: 'UNSEEN' can be used, but since we are polling, we check for subject match
            const searchCriteria = ['UNSEEN', ['SUBJECT', subject]];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: true
            };

            const messages = await connection.search(searchCriteria, fetchOptions);

            if (messages.length > 0) {
                // Get the latest message
                const latestMessage = messages[messages.length - 1];
                const allParts = latestMessage.parts.find((part: any) => part.which === '');
                const id = latestMessage.attributes.uid;

                const mail = await simpleParser(allParts.body);
                console.log(`[IMAP] Found matching email: "${mail.subject}" (UID: ${id})`);

                connection.end();
                return mail;
            }

            connection.end();
        } catch (error: any) {
            console.error(`[IMAP] Error during polling: ${error.message}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    console.error(`[IMAP] Timeout: Email with subject "${subject}" not found within ${timeoutMs / 60000} minutes.`);
    return null;
}

/**
 * Legacy support: Sends an email via browser (if needed).
 * Note: It's better to use an SMTP library for sending as well, but keeping this for now.
 */
export async function sendEmail(
    to: string,
    subject: string,
    body: string
): Promise<void> {
    console.log(`[SMTP] Sending notification to ${to}...`);

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
            user: IMAP_USER,
            pass: IMAP_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false // Match IMAP config for consistency
        }
    });

    const mailOptions = {
        from: IMAP_USER,
        to: to,
        subject: subject,
        text: body,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[SMTP] Email sent successfully to ${to}`);
    } catch (error: any) {
        console.error(`[SMTP] Failed to send email: ${error.message}`);
    }
}
