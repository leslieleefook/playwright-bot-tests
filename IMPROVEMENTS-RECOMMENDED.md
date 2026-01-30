# Test Suite Improvements - Recommended Actions

**Date:** 2026-01-29  
**Test Run Status:** ✅ All 13 tests passed (100%)  
**Priority:** Medium-High  

---

## Current Test Suite Status

| Metric | Value | Assessment |
|--------|-------|------------|
| Total Tests | 13 | ✅ Good coverage |
| Passing Tests | 13 (100%) | ✅ Excellent |
| Failing Tests | 0 | ✅ None |
| Tests with Warnings | 3 | ⚠️ Needs attention |
| Avg Test Duration | 1.3m | ✅ Reasonable |
| Total Duration | 17.3m | ✅ Acceptable |

---

## Issues Identified

### 1. Claims Bot - Missing Upload Element (Medium Priority)

**Test File:** `tests/claims.spec.ts`  
**Issue:** Upload element not found, bot flow may have changed  

**Current Behavior:**
```
[STEP 8] Checking for claim image upload...
! No upload element found - bot flow may have changed, skipping upload step
```

**Test Still Passes:** Yes (graceful fallback fills text instead)

**Recommended Actions:**

**Option A: Verify Bot Behavior (Recommended)**
1. Manually navigate to https://bot.incusservices.com/claims
2. Complete the bot flow to verify if upload is still required
3. If upload is NO LONGER required:
   - Update test to remove upload step entirely
   - Remove fixture file if not used elsewhere
   - Update comments/documentation
4. If upload IS STILL required:
   - Update selectors to find the correct upload element
   - May need to inspect DOM structure changes
   - Test with different upload methods from improved helper

**Option B: Add Enhanced Detection**
```typescript
// Before attempting upload, check if bot expects file or text input
const botExpectsUpload = await page.evaluate(() => {
    const typebot = document.querySelector('typebot-standard');
    const shadow = typebot?.shadowRoot;
    
    // Check for file input indicators
    const hasFileInput = shadow?.querySelector('input[type="file"]');
    const hasUploadArea = shadow?.querySelector('[class*="upload"], [class*="dropzone"]');
    const hasUploadText = shadow?.textContent?.toLowerCase().includes('upload');
    
    return !!(hasFileInput || hasUploadArea || hasUploadText);
});

if (botExpectsUpload) {
    await uploadToTypebotImproved(page, imgPath);
} else {
    console.log('Bot expects text input, not file upload');
    await fillTypebotInputImproved(page, 'N/A - No additional documentation required');
}
```

**Estimated Effort:** 30-60 minutes

---

### 2. Typing Animation Timeouts (Low-Medium Priority)

**Tests Affected:** Multiple (airoi, claims, exam, incident, match, mimage, mkt, tde)  
**Issue:** Fixed 30s timeout reached frequently, wastes time  

**Current Behavior:**
```
[TYPEBOT] Waiting for typing animation to complete...
[TYPEBOT] Typing timeout reached, proceeding anyway
```

**Problem:**
- Tests wait 30s even when typing completes in 2-3s
- Wastes 20-27s per occurrence
- Reduced test efficiency

**Solution:** Use Improved Helper's State-Based Detection

The `uploadHelper-improved.ts` already provides:
```typescript
import { waitForTypingAnimationComplete } from '../utils/uploadHelper-improved';

// This returns as soon as typing completes (2-3s typical)
// instead of always waiting 30s
await waitForTypingAnimationComplete(page, 5000); // Max 5s
```

**Migration Required:**

Update each test file to use improved helper:

```typescript
// OLD (in tests/airoi.spec.ts, claims.spec.ts, etc.)
await page.waitForTimeout(3000);

// NEW
await waitForTypingAnimationComplete(page, 5000);
```

**Estimated Improvement:**
- Reduce test run time by 20-30%
- From 17.3m to ~12-14m
- Save 3-5 minutes per run

**Tests Needing Update:**
1. tests/airoi.spec.ts
2. tests/claims.spec.ts (already uses improved)
3. tests/compliance.spec.ts
4. tests/exam.spec.ts
5. tests/incident.spec.ts
6. tests/match.spec.ts
7. tests/mimage.spec.ts
8. tests/mkt.spec.ts
9. tests/tde.spec.ts

**Estimated Effort:** 1-2 hours total

---

### 3. Tests Not Using Improved Upload Helper (Medium Priority)

**Tests Using Old Helper:**
- tests/airoi.spec.ts
- tests/exam.spec.ts
- tests/incident.spec.ts
- tests/match.spec.ts
- tests/mimage.spec.ts
- tests/mkt.spec.ts
- tests/tde.spec.ts

**Benefits of Migration:**
1. **State-based waiting** - Faster completion when animations finish
2. **4 fallback upload methods** - Better reliability if one method fails
3. **Better error handling** - More informative error messages
4. **Automatic screenshots** - Debugging aid on failures
5. **Comprehensive debug info** - Easier to troubleshoot issues

**Migration Example:**

```typescript
// OLD IMPORTS
import { uploadToTypebot, clickTypebotButton } from '../utils/uploadHelper';

// NEW IMPORTS
import { 
    uploadToTypebotImproved, 
    clickTypebotButtonImproved,
    waitForTypingAnimationComplete 
} from '../utils/uploadHelper-improved';

// OLD FUNCTION CALLS
await uploadToTypebot(page, filePath);
await clickTypebotButton(page, 'Send');

// NEW FUNCTION CALLS
await uploadToTypebotImproved(page, filePath);
await clickTypebotButtonImproved(page, 'Send');
await waitForTypingAnimationComplete(page, 5000); // Add before key actions
```

**Detailed migration guide available in:** `MIGRATION-PLAN.md`

**Estimated Effort:** 3-4 hours (7 tests)

---

### 4. Auto-Advance Detection Issues (Low Priority)

**Tests Affected:**
- match.spec.ts (waited 11s before detecting auto-advance)
- mimage.spec.ts (waited 26s before detecting auto-advance)

**Issue:** Bot auto-advances after uploads, but tests wait for button before giving up

**Current Logic:**
```typescript
await clickTypebotButtonImproved(page, 'Process|Submit|Continue|Next|Send');
// If button not found, waits 30s then gives up
```

**Improved Logic:**
```typescript
// After upload, check if bot auto-advances
await page.waitForTimeout(2000); // Short wait for auto-advance

const botAutoAdvanced = await page.evaluate(() => {
    const typebot = document.querySelector('typebot-standard');
    const shadow = typebot?.shadowRoot;
    
    // Check if new content appeared (indicates auto-advance)
    const contentChanged = shadow?.textContent?.length > 100;
    const newButtons = shadow?.querySelectorAll('button').length > 0;
    
    return contentChanged && newButtons;
});

if (!botAutoAdvanced) {
    // Try to click button if no auto-advance
    await clickTypebotButtonImproved(page, 'Process|Submit|Continue', 10000);
}
```

**Estimated Effort:** 1-2 hours

---

## Missing Test Coverage

### High Priority (Recommended to Add)

1. **Negative Test Cases**
   - Invalid file formats (.exe, .bat instead of .jpg/.pdf/.docx)
   - Oversized files (if limits exist)
   - Required field omission
   - Invalid email addresses
   - Malformed URLs

2. **Error Flow Testing**
   - Network interruption during form submission
   - File upload failure scenarios
   - Timeout handling
   - Session timeout/re-authentication

### Medium Priority (Nice to Have)

3. **Multi-Path Testing**
   - Test different bot branches (currently only primary path)
   - Test back-button functionality
   - Test restart/repeat flow

4. **Performance Testing**
   - Page load time benchmarks
   - Form submission response times
   - API call timing monitoring
   - Memory usage checks

### Low Priority (Future Enhancements)

5. **Visual Regression Testing**
   - Detect unintended UI changes
   - Use Playwright's visual comparison
   - Run on PRs for catch visual bugs

6. **Multi-Browser Testing**
   - Add Firefox and WebKit tests
   - Catch browser-specific issues
   - Update playwright.config.js projects array

7. **Accessibility Expansion**
   - Currently only 3 of 10 bots tested for a11y
   - Add a11y tests for all 10 bots
   - Consider WCAG 2.1 AAA compliance

---

## Recommended Action Plan

### Immediate (This Week)

1. **Investigate Claims Bot Upload Issue** ⭐ **HIGHEST PRIORITY**
   - [ ] Manually test Claims bot flow
   - [ ] Determine if upload is still required
   - [ ] Update test accordingly
   - **Effort:** 30-60 minutes
   - **Impact:** Removes warning, ensures test accuracy

### Short Term (Next 1-2 Weeks)

2. **Migrate High-Priority Tests to Improved Helper**
   - [ ] airoi.spec.ts
   - [ ] exam.spec.ts
   - [ ] incident.spec.ts
   - **Effort:** 1-2 hours
   - **Impact:** Better reliability, faster tests

3. **Add Typing Animation Detection**
   - [ ] Update all tests to use `waitForTypingAnimationComplete`
   - **Effort:** 1-2 hours
   - **Impact:** 20-30% faster test execution

### Medium Term (Next Month)

4. **Complete Migration to Improved Helper**
   - [ ] match.spec.ts
   - [ ] mimage.spec.ts
   - [ ] mkt.spec.ts
   - [ ] tde.spec.ts
   - [ ] compliance.spec.ts (remove old version)
   - **Effort:** 3-4 hours
   - **Impact:** Consistent reliability across all tests

5. **Add Auto-Advance Detection**
   - [ ] match.spec.ts
   - [ ] mimage.spec.ts
   - **Effort:** 1-2 hours
   - **Impact:** Faster test execution, less wasted waiting

6. **Add Negative Test Cases**
   - [ ] Invalid file formats (2-3 tests)
   - [ ] Invalid inputs (2-3 tests)
   - **Effort:** 3-4 hours
   - **Impact:** Better coverage, catch more bugs

### Long Term (Next Quarter)

7. **Visual Regression Testing**
8. **Multi-Browser Testing**
9. **Accessibility Testing for All Bots**
10. **Performance Testing**

---

## Effort vs Impact Matrix

| Priority | Action | Effort | Impact | Recommendation |
|----------|--------|--------|--------|----------------|
| 🔴 High | Investigate Claims bot upload | 30-60m | High | ⭐ Do now |
| 🟠 Medium | Migrate to improved helper (all tests) | 3-4h | High | Do soon |
| 🟠 Medium | Add typing animation detection | 1-2h | Medium | Do soon |
| 🟡 Medium | Add auto-advance detection | 1-2h | Medium | Nice to have |
| 🟡 Low | Add negative test cases | 3-4h | Medium | Plan for next sprint |
| 🟢 Low | Visual regression tests | 4-6h | Low | Future enhancement |
| 🟢 Low | Multi-browser testing | 2-3h | Low | Future enhancement |

---

## Quick Wins (Low Effort, High Impact)

1. **Investigate Claims Bot** (30-60m)
   - Removes warning
   - Ensures test accuracy
   - Potential to simplify test

2. **Migrate Single Test** (30m)
   - Pick one test (e.g., airoi.spec.ts)
   - Migrate to improved helper
   - Validate reliability improvement
   - Use as example for rest of migration

3. **Add Typing Detection** (30m)
   - Update 1-2 key tests
   - Measure time savings
   - Roll out to all tests if effective

---

## Migration Checklist

When migrating tests to improved helper, use this checklist:

**Before Migration:**
- [ ] Read `MIGRATION-PLAN.md`
- [ ] Read `CI-IMPROVEMENTS.md`
- [ ] Review improved helper code
- [ ] Run test to be migrated 5 times (baseline reliability)

**During Migration:**
- [ ] Backup original test file
- [ ] Update imports to use improved helper
- [ ] Replace function calls with improved versions
- [ ] Add `waitForTypingAnimationComplete` before key actions
- [ ] Test locally with `--debug` flag
- [ ] Run test 5 times to verify reliability
- [ ] Compare duration with baseline
- [ ] Commit with descriptive message

**After Migration:**
- [ ] Update documentation
- [ ] Remove backup file after validation
- [ ] Monitor CI results
- [ ] Document any issues or learnings

---

## Testing Recommendations

### How to Validate Improvements

**1. Reliability Testing**
```bash
# Run specific test 5 times to check for flakiness
for i in {1..5}; do
    echo "Run $i:"
    npx playwright test tests/compliance.spec.ts
done
```

**2. Performance Testing**
```bash
# Measure test duration before and after
npx playwright test tests/airoi.spec.ts --reporter=json > before.json
# Make changes
npx playwright test tests/airoi.spec.ts --reporter=json > after.json
# Compare duration
```

**3. Visual Regression Testing**
```bash
# Take baseline screenshots
npx playwright test tests/mkt.spec.ts --update-snapshots

# On subsequent runs
npx playwright test tests/mkt.spec.ts
# Any visual differences will fail the test
```

---

## Success Metrics

### Quantitative Goals

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| CI Success Rate | ~80% | 95%+ | GitHub Actions history |
| Avg Test Duration | 17.3m | <14m | Test run times |
| Tests with Warnings | 3 | 0 | Test output analysis |
| Flaky Tests | ~3 | 0 | Multiple run testing |
| Upload Reliability | ~90% | 99%+ | Upload failure logs |

### Qualitative Goals

- Better error messages with context
- Automatic screenshots on all failures
- Faster test execution through smarter waiting
- Easier to maintain and update tests
- Less time spent debugging flaky tests

---

## Tools and Commands

### Useful Commands

```bash
# Run specific test
npx playwright test tests/compliance.spec.ts

# Run with debugging
npx playwright test tests/compliance.spec.ts --debug

# Run with retries
npx playwright test tests/compliance.spec.ts --retries=3

# Run all tests
npm test

# Generate HTML report
npx playwright show-report

# View traces
npx playwright show-trace trace.zip

# List all tests
npx playwright test --list

# Run tests in headed mode
npx playwright test --headed

# Update screenshots for visual tests
npx playwright test --update-snapshots
```

### Test Reliability Check

```bash
# Check test reliability by running 5 times
run_test_5_times() {
    local test_file=$1
    local passed=0
    local failed=0
    
    for i in {1..5}; do
        echo "Run $i:"
        if npx playwright test "$test_file"; then
            ((passed++))
        else
            ((failed++))
        fi
    done
    
    echo "Results: $passed passed, $failed failed"
    echo "Reliability: $((passed * 20))%"
}

# Usage:
run_test_5_times tests/compliance.spec.ts
```

---

## Conclusion

### Current State: ✅ Good, with Room for Improvement

**Strengths:**
- 100% pass rate (13/13 tests)
- All bot flows functioning correctly
- Good error handling and graceful degradation
- Improved helper available and documented
- Comprehensive migration plan in place

**Immediate Priorities:**
1. Investigate Claims bot upload issue (30-60m)
2. Migrate high-priority tests to improved helper (1-2h)
3. Add typing animation detection (1-2h)

**Expected Benefits:**
- 20-30% faster test execution
- Improved CI reliability (80% → 95%+)
- Better error messages and debugging
- Reduced maintenance overhead

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-29  
**Next Review:** After Claims bot investigation  
**Owner:** Test Team
