import { IMAP_USER, IMAP_PASSWORD, IMAP_HOST, IMAP_PORT } from './constants.ts';
import imaps from 'imap-simple';

async function verifyMailSettings() {
    const config = {
        imap: {
            user: IMAP_USER,
            password: IMAP_PASSWORD,
            host: IMAP_HOST,
            port: IMAP_PORT,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 5000
        }
    };

    console.log(`[VERIFY] Attempting to connect to ${IMAP_HOST} as ${IMAP_USER}...`);
    console.log(`[VERIFY] DEBUG: IMAP_USER is ${IMAP_USER ? 'SET' : 'NOT SET'}`);
    console.log(`[VERIFY] DEBUG: IMAP_PASSWORD is ${IMAP_PASSWORD ? 'SET' : 'NOT SET'} (Length: ${IMAP_PASSWORD.length})`);

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Search for all messages to get the count
        const searchCriteria = ['ALL'];
        const fetchOptions = {
            bodies: ['HEADER'],
            struct: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`[VERIFY] Connection SUCCESSFUL!`);
        console.log(`[VERIFY] Total messages in INBOX: ${messages.length}`);

        connection.end();
    } catch (error: any) {
        console.error(`[VERIFY] Connection FAILED: ${error.message}`);
        if (error.source === 'timeout') {
            console.error('[VERIFY] Possible causes: Network issue, firewall, or incorrect host/port.');
        } else if (error.message.includes('authentication')) {
            console.error('[VERIFY] Possible causes: Invalid username or password.');
        }
    }
}

verifyMailSettings();
