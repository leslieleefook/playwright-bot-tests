import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility (a11y) Tests
 * 
 * Uses axe-core to scan bot pages for WCAG violations.
 * This helps ensure our bots are accessible to users with disabilities.
 */

// Bot URLs to test for accessibility
const BOT_URLS = [
    { name: 'MKT Bot', url: 'https://bot.incusservices.com/mkt' },
    { name: 'TDE Bot', url: 'https://bot.incusservices.com/tde' },
    { name: 'Claims Bot', url: 'https://bot.incusservices.com/claims' },
];

test.describe('Accessibility Tests', () => {
    
    test('MKT Bot page should have no critical accessibility violations', async ({ page }) => {
        const botUrl = 'https://bot.incusservices.com/mkt';
        console.log(`Testing accessibility for: ${botUrl}`);
        
        await page.goto(botUrl);
        
        // Wait for Typebot to load
        await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 40000 });
        await page.waitForTimeout(3000); // Allow animations to settle
        
        // Run axe accessibility scan
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']) // WCAG 2.1 Level AA
            .analyze();
        
        // Log violations for debugging
        if (accessibilityScanResults.violations.length > 0) {
            console.log('Accessibility violations found:');
            accessibilityScanResults.violations.forEach((violation, index) => {
                console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
                console.log(`   Impact: ${violation.impact}`);
                console.log(`   Help: ${violation.helpUrl}`);
                console.log(`   Elements affected: ${violation.nodes.length}`);
            });
        }
        
        // Filter for critical and serious violations only
        const criticalViolations = accessibilityScanResults.violations.filter(
            v => v.impact === 'critical' || v.impact === 'serious'
        );
        
        // Assert no critical/serious violations
        expect(criticalViolations, 
            `Found ${criticalViolations.length} critical/serious accessibility violations`
        ).toHaveLength(0);
        
        console.log(`✓ Accessibility scan passed. Total violations: ${accessibilityScanResults.violations.length}, Critical/Serious: ${criticalViolations.length}`);
    });

    test('should generate accessibility report for all bot pages', async ({ page }) => {
        const allResults: { name: string; violations: number; critical: number }[] = [];
        
        for (const bot of BOT_URLS) {
            console.log(`\nScanning ${bot.name} (${bot.url})...`);
            
            try {
                await page.goto(bot.url, { timeout: 60000 });
                
                // Wait for page to load (Typebot widget if present)
                try {
                    await page.locator('typebot-standard').waitFor({ state: 'attached', timeout: 20000 });
                } catch {
                    // Some pages may not have Typebot, continue anyway
                    await page.waitForTimeout(3000);
                }
                
                const results = await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa'])
                    .analyze();
                
                const criticalCount = results.violations.filter(
                    v => v.impact === 'critical' || v.impact === 'serious'
                ).length;
                
                allResults.push({
                    name: bot.name,
                    violations: results.violations.length,
                    critical: criticalCount
                });
                
                console.log(`  ${bot.name}: ${results.violations.length} violations (${criticalCount} critical/serious)`);
                
            } catch (error) {
                console.log(`  ${bot.name}: Failed to scan - ${error}`);
                allResults.push({
                    name: bot.name,
                    violations: -1,
                    critical: -1
                });
            }
        }
        
        // Summary report
        console.log('\n=== Accessibility Summary ===');
        allResults.forEach(r => {
            const status = r.critical === 0 ? '✓' : r.critical > 0 ? '✗' : '?';
            console.log(`${status} ${r.name}: ${r.violations} total, ${r.critical} critical`);
        });
        
        // Test passes if we completed the scan (even with violations, for reporting purposes)
        expect(allResults.length).toBeGreaterThan(0);
    });
});
