# Theme Selection Fix - Manual Verification Checklist

## Prerequisites

- [ ] Run `npm install` to ensure dependencies are up to date
- [ ] Run `npm run check-all` to verify all quality checks pass
- [ ] Run `cargo test settings` to verify backend tests pass

## Test Scenarios

### Scenario 1: Basic Theme Selection

**Steps:**

1. [ ] Start the app: `npm run tauri dev`
2. [ ] Open Settings window
3. [ ] Navigate to General tab
4. [ ] Current theme should be displayed (default: System)
5. [ ] Click "Dark" button
6. [ ] Verify:
   - [ ] Success message appears: "Settings saved successfully"
   - [ ] Theme changes to dark IMMEDIATELY (no refresh needed)
   - [ ] Background becomes dark
   - [ ] Text becomes light
7. [ ] Click "Light" button
8. [ ] Verify:
   - [ ] Success message appears again
   - [ ] Theme changes to light IMMEDIATELY
   - [ ] Background becomes light
   - [ ] Text becomes dark
9. [ ] Click "System" button
10. [ ] Verify:
    - [ ] Theme matches your OS setting
    - [ ] Success message appears

**Expected Result**: All theme changes apply instantly with success feedback.

---

### Scenario 2: Theme Persistence Across App Restarts

**Steps:**

1. [ ] Set theme to "Dark"
2. [ ] Verify dark theme is active
3. [ ] Close the app completely (not just hide window)
4. [ ] Restart the app: `npm run tauri dev`
5. [ ] Verify:
   - [ ] App starts in dark theme
   - [ ] Settings → General shows "Dark" as selected

**Expected Result**: Theme persists across app restarts.

---

### Scenario 3: System Theme Detection

**Steps:**

1. [ ] Set app theme to "System"
2. [ ] Note current app appearance (light or dark)
3. [ ] Change your OS theme:
   - **macOS**: System Preferences → General → Appearance
   - **Linux**: System Settings → Appearance
4. [ ] Verify:
   - [ ] App theme updates automatically to match OS
   - [ ] No refresh or settings change needed

**Expected Result**: System theme changes are detected and applied in real-time.

---

### Scenario 4: Multi-Window Synchronization

**Steps:**

1. [ ] Open Settings window (Settings → General)
2. [ ] Open Search window (Cmd/Ctrl+Shift+S)
3. [ ] Keep both windows visible
4. [ ] In Settings window: Change theme to "Dark"
5. [ ] Verify:
   - [ ] Settings window turns dark immediately
   - [ ] Search window turns dark immediately (synchronized)
6. [ ] Change theme to "Light"
7. [ ] Verify:
   - [ ] Both windows turn light immediately

**Expected Result**: Theme changes sync instantly across all open windows.

---

### Scenario 5: Quick Theme Switching

**Steps:**

1. [ ] In Settings → General, rapidly click:
   - [ ] Dark
   - [ ] Light
   - [ ] System
   - [ ] Dark
   - [ ] Light
2. [ ] Verify:
   - [ ] Each click applies immediately
   - [ ] No lag or flash of wrong theme
   - [ ] Final theme matches last selection
   - [ ] Success message appears for each change

**Expected Result**: Rapid theme changes are handled smoothly without errors.

---

### Scenario 6: Theme with Different Content

**Steps:**

1. [ ] Set theme to "Dark"
2. [ ] Open Search window (Cmd/Ctrl+Shift+S)
3. [ ] Search for snippets (if you have any)
4. [ ] Verify:
   - [ ] Search input is dark-themed
   - [ ] Results list is dark-themed
   - [ ] Selected items have proper dark highlight
5. [ ] Switch to "Light" theme in Settings
6. [ ] Verify Search window updates to light theme

**Expected Result**: All UI components respect theme changes.

---

### Scenario 7: Error Handling (Simulated)

**Steps:**

1. [ ] Open browser dev tools (if using `tauri dev`)
2. [ ] Monitor console for errors
3. [ ] Perform several theme changes
4. [ ] Verify:
   - [ ] No error messages in console
   - [ ] No warning messages related to theme
   - [ ] Only expected log: "Failed to load theme..." on intentional errors

**Expected Result**: No unexpected errors or warnings.

---

### Scenario 8: Database Verification

**Steps:**

1. [ ] Set theme to "Dark" in UI
2. [ ] Close the app
3. [ ] Find the database file:
   - **macOS**: `~/Library/Application Support/com.snips.app/snips.db`
   - **Linux**: `~/.local/share/com.snips.app/snips.db`
4. [ ] Open database with SQLite browser (e.g., `sqlite3`)
5. [ ] Run query:
   ```sql
   SELECT value FROM settings WHERE key = 'app_settings';
   ```
6. [ ] Verify:
   - [ ] JSON contains: `"theme":"dark"`
7. [ ] Change theme to "Light" in UI
8. [ ] Re-run query
9. [ ] Verify:
   - [ ] JSON now contains: `"theme":"light"`

**Expected Result**: Theme changes are persisted to database correctly.

---

## Automated Test Verification

### Frontend Tests

```bash
# Run all theme-related tests
npm run test -- --run src/hooks/useTheme.test.tsx src/components/SettingsWindow/GeneralTab.integration.test.tsx

# Expected: 20/20 tests pass
```

**Checklist:**

- [ ] All 11 useTheme hook tests pass
- [ ] All 9 GeneralTab integration tests pass
- [ ] No test timeouts or flaky failures

### Backend Tests

```bash
# Run settings tests
cargo test settings

# Expected: 13/13 tests pass
```

**Checklist:**

- [ ] All settings service tests pass
- [ ] All settings command tests pass
- [ ] All settings model tests pass

### Code Quality

```bash
# Run all quality checks
npm run check-all
```

**Checklist:**

- [ ] Prettier formatting passes
- [ ] ESLint passes with no warnings
- [ ] TypeScript compilation passes with no errors

---

## Regression Testing

### Test Previous Functionality Still Works

1. [ ] Search functionality works in both themes
2. [ ] Quick-add dialog works in both themes
3. [ ] Snippet creation/editing works in both themes
4. [ ] Settings tabs (General, Snippets, Storage, etc.) all render correctly
5. [ ] Keyboard shortcuts work regardless of theme
6. [ ] Analytics tab displays correctly in both themes

**Expected Result**: All existing features work identically in light and dark themes.

---

## Performance Testing

### Measure Theme Switch Performance

1. [ ] Open browser DevTools → Performance tab
2. [ ] Start recording
3. [ ] Switch theme 5 times rapidly
4. [ ] Stop recording
5. [ ] Verify:
   - [ ] Each theme switch takes <50ms
   - [ ] No layout thrashing
   - [ ] No memory leaks (check Memory tab)

**Expected Result**: Theme switches are instant (<50ms) with no performance degradation.

---

## Known Issues (Pre-existing, Not Related to Theme Fix)

❌ **SearchOverlay Tests**: 2 pre-existing test failures

- Issue: Tests expect "1 snippet selected" but UI shows "1 of 1 selected"
- Status: Unrelated to theme changes, exists in main branch

---

## Sign-Off

### Developer Verification

- [ ] All manual tests completed successfully
- [ ] All automated tests pass
- [ ] No new warnings or errors introduced
- [ ] Code reviewed and follows STANDARDS.md
- [ ] Documentation updated (THEME_FIX_REPORT.md)

**Developer**: ********\_********
**Date**: ********\_********

### QA Verification

- [ ] All user scenarios tested
- [ ] Edge cases verified
- [ ] Performance acceptable
- [ ] No regressions found

**QA Engineer**: ********\_********
**Date**: ********\_********

---

## Troubleshooting

### Theme doesn't change when clicking buttons

**Check:**

1. Open DevTools console - any errors?
2. Verify `updateSettings` is being called (add console.log temporarily)
3. Check database write permissions
4. Verify Tauri backend is running (`cargo tauri dev`)

### Theme reverts after app restart

**Check:**

1. Database file exists and is writable
2. No errors during settings save
3. Run database verification test (Scenario 8)

### Theme doesn't sync across windows

**Check:**

1. Event system is working (`listen` function imported correctly)
2. All windows are using the same database file
3. Backend is emitting `settings-changed` event

### System theme detection not working

**Check:**

1. OS theme API is accessible
2. `matchMedia` working (test in browser console)
3. Theme is set to "System" not "Light" or "Dark"

---

## Post-Deployment Monitoring

### Metrics to Watch

- [ ] Error rate for theme-related operations
- [ ] Settings update latency (should be <100ms p99)
- [ ] Event listener memory usage
- [ ] User reports of theme issues

### Rollback Plan

If critical issues are found:

1. Revert commit: `git revert <commit-hash>`
2. Rebuild: `npm run tauri build`
3. Deploy previous version
4. Document issues for future fix

---

**Status**: ✅ Ready for manual verification and deployment
