const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

/**
 * Polls the IMAP server for a specific subject.
 * Returns the parsed email object or null if timeout.
 */
async function waitForEmailConfirmation(config, subject, timeoutMs = 120000) {
    console.log(`[IMAP] Polling for subject: "${subject}"...`);
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        let connection;
        try {
            connection = await imaps.connect({ imap: config });
            await connection.openBox('INBOX');

            // Search for unread emails with relevant subject
            const searchCriteria = ['UNSEEN', ['SUBJECT', subject]];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''],
                markSeen: true
            };

            const messages = await connection.search(searchCriteria, fetchOptions);

            if (messages.length > 0) {
                const latestMessage = messages[messages.length - 1];
                const allParts = latestMessage.parts.find(part => part.which === '');
                const mail = await simpleParser(allParts.body);
                console.log(`[IMAP] SUCCESS: Found email - ${mail.subject}`);
                connection.end();
                return mail;
            }
            connection.end();
        } catch (error) {
            console.error(`[IMAP] Polling error: ${error.message}`);
            if (connection) connection.end();
        }
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    console.error(`[IMAP] TIMEOUT: No email found with subject "${subject}" after ${timeoutMs / 1000}s`);
    return null;
}

module.exports = { waitForEmailConfirmation };
