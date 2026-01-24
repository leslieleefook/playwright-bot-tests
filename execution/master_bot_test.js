const { execSync } = require('child_process');
const path = require('path');

const bots = [
    { name: 'MKT Bot', spec: 'execution/mkt_bot.spec.js' },
    { name: 'Claims Bot', spec: 'execution/claims_bot.spec.js' },
    { name: 'TDE Bot', spec: 'execution/tde_bot.spec.js' },
    { name: 'Airoi Bot', spec: 'execution/airoi_bot.spec.js' }
];

console.log('Starting Automated Bot Interaction Suite...');
console.log('------------------------------------------');

for (const bot of bots) {
    console.log(`\n[RUNNING] ${bot.name}...`);
    try {
        execSync(`npx playwright test ${bot.spec}`, { stdio: 'inherit' });
        console.log(`[PASS] ${bot.name} completed successfully.`);
    } catch (error) {
        console.error(`[FAIL] ${bot.name} failed during interaction.`);
        console.log(`Triggering failure notification for ${bot.name}...`);

        try {
            // Trigger the notification script with environment variables
            const reason = `The interaction flow for ${bot.name} encountered an error or failed to reach the success state. Check the latest test results for details.`;
            execSync(`$env:BOT_NAME="${bot.name}"; $env:FAILURE_REASON="${reason}"; npx playwright test execution/notify_failure.spec.js`, {
                stdio: 'inherit',
                shell: 'powershell.exe'
            });
            console.log(`[NOTIFICATION SENT] Failure alert dispatched for ${bot.name}.`);
        } catch (notifyError) {
            console.error(`[CRITICAL] Failed to send notification for ${bot.name}:`, notifyError.message);
        }
    }
}

console.log('\n------------------------------------------');
console.log('Bot Interaction Suite Execution Finished.');
