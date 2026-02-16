# Coverage

Generate test coverage report and identify uncovered code paths.

---

## Command Usage

`/coverage [options]`

- Basic: `/coverage` (run with defaults)
- With threshold: `/coverage --threshold 80`
- Specific path: `/coverage src/components/`
- Report only: `/coverage --report-only` (show last report without running tests)

---

## Your Task

Detect the test runner, run tests with coverage enabled, parse the report, and highlight critical uncovered paths.

### Step 1: Detect Test Runner

```bash
# Check for test configs
ls vitest.config.* vite.config.* jest.config.* c8.config.* nyc.config.* .nycrc* pytest.ini pyproject.toml 2>/dev/null
```

Determine the test runner:

| Found | Runner | Coverage Tool |
|-------|--------|---------------|
| `vitest.config.*` or `vite.config.*` with vitest | Vitest | Built-in (v8 or c8) |
| `jest.config.*` | Jest | Built-in or `--coverage` |
| `.nycrc*` or `nyc.config.*` | NYC/Istanbul | NYC |
| `c8.config.*` | c8 | c8 |
| `pytest.ini` or pyproject with pytest | pytest | pytest-cov |

If no test runner found:
```
⚠️  No test runner configuration found.

This project doesn't appear to have a test framework set up.

Options:
1. Set up Vitest (recommended for Vite projects)
2. Set up Jest
3. Specify test command manually

Your choice [1-3]:
```

### Step 2: Check Coverage Configuration

**For Vitest**, check vite.config.ts or vitest.config.ts:

```typescript
// Should have coverage configured
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',  // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage'
    }
  }
})
```

If missing:
```
⚠️  Coverage not configured in Vitest.

Add to vite.config.ts:

  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage'
    }
  }

Would you like me to add this configuration? [Y/n]
```

**For Jest**, check jest.config.*:

```javascript
// Should have coverage configured
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json', 'html']
}
```

### Step 3: Run Coverage

```
═══════════════════════════════════════════════
   RUNNING COVERAGE
═══════════════════════════════════════════════

Test Runner: Vitest
Coverage Provider: v8
Output Directory: ./coverage

Running: npm run test -- --coverage
```

Execute the coverage command:

```bash
# Vitest
npm run test -- --coverage 2>&1

# Jest
npm run test -- --coverage 2>&1

# pytest
pytest --cov=src --cov-report=term-missing --cov-report=json 2>&1
```

### Step 4: Parse Coverage Report

Read the coverage summary from JSON or terminal output:

**Vitest/Jest (coverage/coverage-summary.json)**:
```bash
cat coverage/coverage-summary.json 2>/dev/null
```

**pytest (coverage.json)**:
```bash
cat coverage.json 2>/dev/null
```

Extract key metrics:

```
═══════════════════════════════════════════════
   COVERAGE REPORT
═══════════════════════════════════════════════

Overall Coverage: 73.5%

╭──────────────────┬────────────┬─────────────╮
│ Metric           │ Covered    │ Percentage  │
├──────────────────┼────────────┼─────────────┤
│ Statements       │ 1,245/1,695│ 73.5%       │
│ Branches         │ 312/485    │ 64.3%       │
│ Functions        │ 156/198    │ 78.8%       │
│ Lines            │ 1,189/1,620│ 73.4%       │
╰──────────────────┴────────────┴─────────────╯
```

### Step 5: Identify Critical Uncovered Paths

Analyze uncovered code and prioritise by importance:

**Priority 1 (Critical)** - Business logic, security, data handling:
- Authentication/authorization code
- Payment/transaction processing
- Data validation
- Error handlers that could fail silently

**Priority 2 (Important)** - Core features:
- Main user flows
- API endpoints
- State management
- Utility functions used widely

**Priority 3 (Low)** - Edge cases, UI:
- Rarely-used features
- Cosmetic UI code
- Development-only code

```
═══════════════════════════════════════════════
   UNCOVERED CODE ANALYSIS
═══════════════════════════════════════════════

🔴 CRITICAL (needs immediate attention):

  src/auth/middleware.ts (42% covered)
  ├─ Lines 45-67: Token validation logic
  ├─ Lines 89-102: Role-based access check
  └─ Impact: Security vulnerability if these paths fail

  src/api/payments.ts (38% covered)
  ├─ Lines 112-145: Refund processing
  └─ Impact: Financial transactions untested

🟡 IMPORTANT (should be covered):

  src/components/UserForm.tsx (55% covered)
  ├─ Lines 78-92: Form validation
  └─ Impact: User experience issues

  src/utils/dataTransform.ts (61% covered)
  ├─ Lines 34-56: Edge case handling
  └─ Impact: Data corruption risk

🟢 LOW PRIORITY (nice to have):

  src/components/LoadingSpinner.tsx (25% covered)
  └─ Reason: UI-only, no logic

  src/dev/debugTools.ts (0% covered)
  └─ Reason: Development-only code
```

### Step 6: Check Against Threshold

If threshold specified (or project has one configured):

```
═══════════════════════════════════════════════
   THRESHOLD CHECK
═══════════════════════════════════════════════

Required: 80%
Actual: 73.5%
Status: ❌ BELOW THRESHOLD

Gap: 6.5% (approximately 110 lines)

Fastest path to 80%:
1. src/auth/middleware.ts (+15 lines = +0.9%)
2. src/api/payments.ts (+45 lines = +2.7%)
3. src/components/UserForm.tsx (+20 lines = +1.2%)
4. src/utils/dataTransform.ts (+30 lines = +1.8%)

Total: +110 lines to reach 80%
```

If threshold met:
```
═══════════════════════════════════════════════
   ✅ THRESHOLD MET
═══════════════════════════════════════════════

Required: 80%
Actual: 82.3%
Status: ✅ PASSING

Margin: +2.3% above threshold
```

### Step 7: Output Summary

```
═══════════════════════════════════════════════
   COVERAGE SUMMARY
═══════════════════════════════════════════════

Overall: 73.5% (1,245/1,695 statements)

By Category:
  Statements: 73.5%
  Branches:   64.3% ← Lowest
  Functions:  78.8%
  Lines:      73.4%

Critical Gaps:
  🔴 src/auth/middleware.ts (42%)
  🔴 src/api/payments.ts (38%)

Reports:
  HTML: coverage/index.html
  JSON: coverage/coverage-summary.json
  Text: (shown above)

═══════════════════════════════════════════════
   NEXT STEPS
═══════════════════════════════════════════════

1. Open HTML report     - Detailed line-by-line view
2. Focus on critical    - Write tests for 🔴 items
3. Generate test stubs  - Scaffold tests for uncovered
4. Set threshold        - Add to CI pipeline
5. Done for now

Your choice [1-5]:
```

---

## Coverage Configuration Templates

### Vitest (vite.config.ts)

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/test/**/*'
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      }
    }
  }
})
```

### Jest (jest.config.js)

```javascript
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'json', 'html'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  }
}
```

### pytest (pyproject.toml)

```toml
[tool.pytest.ini_options]
addopts = "--cov=src --cov-report=term-missing --cov-report=html --cov-report=json"

[tool.coverage.run]
source = ["src"]
omit = ["**/test_*.py", "**/conftest.py"]

[tool.coverage.report]
fail_under = 80
exclude_lines = [
    "pragma: no cover",
    "if __name__ == .__main__.:",
    "raise NotImplementedError"
]
```

---

## Error Handling

**If tests fail:**
```
❌ Tests failed - coverage incomplete.

Failed tests: 3

Please fix failing tests first, then re-run coverage.

Would you like to:
1. See failed test details
2. Run coverage anyway (--ignore-failures)
3. Cancel

Your choice [1-3]:
```

**If coverage tool not installed:**
```
❌ Coverage tool not found.

For Vitest: npm install -D @vitest/coverage-v8
For Jest: npm install -D jest (coverage built-in)
For pytest: pip install pytest-cov

Would you like me to install the coverage tool? [Y/n]
```

**If coverage report not generated:**
```
⚠️  Coverage report not generated.

Check:
1. Coverage is enabled in config
2. Tests actually ran
3. Output directory is writable

Last command output:
[show relevant error output]
```

---

## Options Reference

| Option | Description | Example |
|--------|-------------|---------|
| `--threshold N` | Fail if below N% | `--threshold 80` |
| `--report-only` | Show last report | `--report-only` |
| `--include PATH` | Only cover path | `--include src/api/` |
| `--exclude PATH` | Exclude from coverage | `--exclude src/test/` |
| `--json` | Output JSON summary | `--json` |
| `--open` | Open HTML report in browser | `--open` |

---

## CI Integration

**GitHub Actions:**

```yaml
- name: Run tests with coverage
  run: npm run test -- --coverage

- name: Check coverage threshold
  run: |
    COVERAGE=$(jq '.total.statements.pct' coverage/coverage-summary.json)
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80% threshold"
      exit 1
    fi
```

**Pre-commit hook:**

```bash
#!/bin/sh
npm run test -- --coverage --threshold 80 || exit 1
```

---

## Important Notes

- **Vitest v8 provider**: Fastest, works with most projects
- **Jest coverage**: Built-in, no extra install needed
- **Branch coverage**: Often lower than line coverage - focus here
- **Critical paths**: Prioritise security and business logic
- **Thresholds**: Set realistic goals, improve incrementally

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
