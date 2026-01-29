# Test Migration Plan - Playwright Bot Tests

**Status:** 🟡 Ready for Review  
**Created:** 2026-01-29  
**Estimated Completion:** 1 week

---

## Overview

This document outlines the plan to migrate existing tests to use the improved upload helper (`uploadHelper-improved.ts`). The goal is to improve test reliability and reduce flaky test failures in CI.

## Current State

### Flaky Tests Identified

| Test | Issue | Frequency | Impact |
|------|-------|-----------|--------|
| `compliance.spec.ts` | Multi-file upload timing | ~30% failures | High |
| `claims.spec.ts` | Upload element not found | ~20% failures | Medium |
| `airoi.spec.ts` | Form element timeouts | ~15% failures | Medium |

### Test Statistics

- **Total Tests:** 11 (10 active, 1 skipped)
- **Tests with Upload:** 7 (compliance, exam, incident, match, mimage, claims)
- **Tests with Form Inputs:** 4 (airoi, claims, match, mkt)
- **CI Success Rate:** ~80% (target: 95%+)

---

## Migration Strategy

### Phase 1: Validation (1-2 days)

**Goal:** Validate that improved helper works as expected

**Tasks:**
1. [ ] Run `compliance-improved.spec.ts` locally 5 times
2. [ ] Compare reliability with original `compliance.spec.ts`
3. [ ] Check for any regressions or issues
4. [ ] Review logs and screenshots from test runs
5. [ ] Document any issues found

**Acceptance Criteria:**
- ✅ Improved test passes 5/5 times locally
- ✅ No new errors or issues introduced
- ✅ Logs show state-based waiting (not just timeouts)

**Commands:**
```bash
# Run improved test 5 times
for i in {1..5}; do
    echo "Run $i:"
    npx playwright test tests/compliance-improved.spec.ts
done

# Compare with original
for i in {1..5}; do
    echo "Original Run $i:"
    npx playwright test tests/compliance.spec.ts
done
```

---

### Phase 2: High-Priority Migration (2-3 days)

**Goal:** Migrate the most flaky tests to improved helper

**Tests to Migrate:**
1. [ ] `compliance.spec.ts` (replace with improved version)
2. [ ] `claims.spec.ts` (update to use improved helper)
3. [ ] `airoi.spec.ts` (update form waiting logic)

**For each test:**

1. **Backup original test**
   ```bash
   cp tests/compliance.spec.ts tests/compliance.spec.ts.backup
   ```

2. **Update imports**
   ```typescript
   // Old
   import { uploadToTypebot, clickTypebotButton } from '../utils/uploadHelper';
   
   // New
   import { 
       uploadToTypebotImproved, 
       clickTypebotButtonImproved 
   } from '../utils/uploadHelper-improved';
   ```

3. **Replace function calls**
   ```typescript
   // Old
   await uploadToTypebot(page, filePath);
   await clickTypebotButton(page, 'Send');
   
   // New
   await uploadToTypebotImproved(page, filePath);
   await clickTypebotButtonImproved(page, 'Send');
   ```

4. **Add typing animation wait where needed**
   ```typescript
   import { waitForTypingAnimationComplete } from '../utils/uploadHelper-improved';
   
   // Before critical actions
   await waitForTypingAnimationComplete(page, 5000);
   ```

5. **Test locally**
   ```bash
   npx playwright test tests/compliance.spec.ts --debug
   ```

6. **Run 5 times to verify reliability**
   ```bash
   for i in {1..5}; do
       npx playwright test tests/compliance.spec.ts
   done
   ```

7. **Commit with descriptive message**
   ```bash
   git add tests/compliance.spec.ts
   git commit -m "Improve(compliance): Use improved upload helper for better reliability"
   ```

**Acceptance Criteria:**
- ✅ All 3 tests pass consistently (5/5 times)
- ✅ No increase in test duration
- ✅ Better error messages and debugging info

---

### Phase 3: Medium-Priority Migration (1-2 days)

**Goal:** Migrate remaining upload tests

**Tests to Migrate:**
4. [ ] `exam.spec.ts`
5. [ ] `incident.spec.ts`
6. [ ] `match.spec.ts`
7. [ ] `mimage.spec.ts`

**Process:** Same as Phase 2

**Acceptance Criteria:**
- ✅ All tests pass consistently
- ✅ No regressions
- ✅ Improved reliability (fewer failures in CI)

---

### Phase 4: Full Test Suite Validation (1 day)

**Goal:** Ensure entire test suite works with improved helpers

**Tasks:**
1. [ ] Run full test suite locally
2. [ ] Verify all tests pass
3. [ ] Check test duration (should be similar or better)
4. [ ] Review logs for any issues
5. [ ] Create PR for review

**Commands:**
```bash
# Run full test suite
npm test

# Check test duration
npm test --reporter=json > results.json
# Parse JSON for timing info

# Generate HTML report
npx playwright show-report
```

**Acceptance Criteria:**
- ✅ All 10 active tests pass
- ✅ Test duration within 5% of baseline
- ✅ No new warnings or errors

---

### Phase 5: CI Validation (1-2 days)

**Goal:** Validate improvements in CI environment

**Tasks:**
1. [ ] Create PR with all changes
2. [ ] Run CI and monitor results
3. [ ] Check for any CI-specific issues
4. [ ] Verify retry behavior works as expected
5. [ ] Monitor multiple CI runs if possible

**Acceptance Criteria:**
- ✅ CI passes on first run (or with retries)
- ✅ Success rate improves from ~80% to 95%+
- ✅ Better error reporting in CI logs
- ✅ Screenshots captured on failures

---

### Phase 6: Cleanup (1 day)

**Goal:** Clean up old code and documentation

**Tasks:**
1. [ ] Remove backup test files (`.backup` extension)
2. [ ] Remove old `uploadHelper.ts` (after verifying all tests use improved version)
3. [ ] Update README.md with new helper usage
4. [ ] Update SPRINT_LOG.md with migration results
5. [ ] Archive old test results if needed

**Acceptance Criteria:**
- ✅ No unused code left in repository
- ✅ Documentation updated
- ✅ Git history clean

---

## Risk Assessment

### Low Risk

- ✅ Adding improved helper (doesn't affect existing tests)
- ✅ Running validation tests locally
- ✅ Creating backups before modifications

### Medium Risk

- ⚠️ Updating test files while maintaining functionality
- ⚠️ Potential changes in test duration
- ⚠️ CI environment differences

**Mitigation:**
- Test locally before pushing
- Use feature flags or separate branch
- Run extensive validation

### High Risk

- ❌ Removing old helper before migration complete
- ❌ Modifying core logic without backup
- ❌ Pushing changes without local testing

**Mitigation:**
- Keep old helper until all tests migrated
- Always backup files before editing
- Never push without local validation

---

## Rollback Plan

If issues arise during migration:

### Immediate Rollback (Within Phase)

```bash
# Restore backup of specific test
git checkout HEAD -- tests/compliance.spec.ts
# Or
cp tests/compliance.spec.ts.backup tests/compliance.spec.ts

# Revert to old helper
import { uploadToTypebot } from '../utils/uploadHelper';
```

### Full Rollback (After Multiple Phases)

```bash
# Reset to branch before migration
git checkout -b rollback-migration
git revert <commit-hash-of-migration-start>

# Or restore from backup branch
git checkout <pre-migration-branch>
```

---

## Success Metrics

### Quantitative Metrics

| Metric | Before | Target | After (Measured) |
|--------|--------|--------|------------------|
| CI Success Rate | 80% | 95%+ | TBD |
| Average Test Duration | ~4 min | <5 min | TBD |
| Flaky Test Count | 3 | 0 | TBD |
| Retry Rate | ~20% | <5% | TBD |

### Qualitative Metrics

- ✅ Better error messages and debugging info
- ✅ Screenshots automatically captured on failures
- ✅ Easier to maintain and update tests
- ✅ Less time spent debugging flaky tests

---

## Timeline

| Week | Phase | Tasks |
|------|-------|-------|
| **Day 1-2** | Phase 1 | Validate improved helper with compliance test |
| **Day 3-5** | Phase 2 | Migrate high-priority tests (compliance, claims, airoi) |
| **Day 6-7** | Phase 3 | Migrate medium-priority tests (exam, incident, match, mimage) |
| **Day 8** | Phase 4 | Full test suite validation |
| **Day 9-10** | Phase 5 | CI validation and monitoring |
| **Day 11** | Phase 6 | Cleanup and documentation updates |

---

## Resources

### Documentation

- **CI-IMPROVEMENTS.md** - Detailed improvements and best practices
- **AUDIT_REPORT.md** - Initial audit findings
- **CODE_REVIEW_REPORT.md** - Code review and recommendations
- **README.md** - Project setup and usage

### Code

- **utils/uploadHelper-improved.ts** - New improved helper
- **tests/compliance-improved.spec.ts** - Reference implementation
- **utils/uploadHelper.ts** - Original helper (to be removed after migration)

### Commands

```bash
# Test specific file
npx playwright test tests/compliance.spec.ts

# Test with debugging
npx playwright test --debug

# Test with retries
npx playwright test --retries=3

# Run all tests
npm test

# Generate report
npx playwright show-report
```

---

## Support and Questions

### Who to Contact

- **Technical Questions:** Review CI-IMPROVEMENTS.md documentation
- **Process Questions:** Refer to AGENTS.md in workspace
- **Issues:** Check troubleshooting section in CI-IMPROVEMENTS.md

### Getting Help

1. Check CI-IMPROVEMENTS.md for common issues
2. Review audit and code review reports
3. Check GitHub Issues for related problems
4. Run tests with `--debug` flag for detailed output

---

## Checklist Summary

### Before Starting

- [ ] Read CI-IMPROVEMENTS.md completely
- [ ] Understand the changes made
- [ ] Review improved helper code
- [ ] Run improved compliance test locally
- [ ] Confirm understanding of migration process

### During Migration

- [ ] Always backup files before editing
- [ ] Test locally after each change
- [ ] Run tests 5 times to verify reliability
- [ ] Document any issues or deviations
- [ ] Commit frequently with descriptive messages

### After Migration

- [ ] Full test suite passes locally
- [ ] CI passes consistently
- [ ] Documentation updated
- [ ] Cleanup completed
- [ ] Success metrics documented

---

**Migration Plan Version:** 1.0  
**Last Updated:** 2026-01-29  
**Status:** Ready for Team Review
