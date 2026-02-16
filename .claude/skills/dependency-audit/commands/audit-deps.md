# Audit Dependencies

Run comprehensive dependency audit and provide prioritised findings.

---

## Command Usage

`/audit-deps [options]`

- Full audit: `/audit-deps`
- Security only: `/audit-deps --security`
- Outdated only: `/audit-deps --outdated`
- With auto-fix: `/audit-deps --fix`
- Specific path: `/audit-deps ./packages/api`

---

## Your Task

Run a comprehensive dependency audit, parse results, and present prioritised findings with actionable recommendations.

### Step 1: Detect Package Manager

```bash
# Check for lock files
ls package-lock.json pnpm-lock.yaml yarn.lock bun.lockb 2>/dev/null
```

| Found | Package Manager |
|-------|-----------------|
| `pnpm-lock.yaml` | pnpm |
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `bun.lockb` | bun |

If multiple found, prefer in order: pnpm > npm > yarn > bun

### Step 2: Run Security Audit

```bash
# npm
npm audit --json 2>/dev/null | head -500

# pnpm
pnpm audit --json 2>/dev/null | head -500

# yarn
yarn audit --json 2>/dev/null | head -500
```

Parse the JSON output and categorise by severity.

### Step 3: Check Outdated Packages

```bash
# npm
npm outdated --json 2>/dev/null

# pnpm
pnpm outdated --json 2>/dev/null
```

Categorise updates:
- **Major**: First version number changed (breaking changes likely)
- **Minor**: Second version number changed (new features, backwards compatible)
- **Patch**: Third version number changed (bug fixes)

### Step 4: Check Licenses (if --license flag)

```bash
# Using license-checker
npx license-checker --json --production 2>/dev/null | head -200
```

Flag problematic licenses:
- **GPL-3.0, AGPL-3.0**: Copyleft, may require open-sourcing your code
- **UNLICENSED**: No license, cannot legally use
- **Unknown**: Needs manual review

### Step 5: Present Findings

```
═══════════════════════════════════════════════
   DEPENDENCY AUDIT REPORT
═══════════════════════════════════════════════

Project: [package.json name]
Package Manager: [detected]
Scanned: [date/time]

───────────────────────────────────────────────
   SECURITY VULNERABILITIES
───────────────────────────────────────────────
```

**For each vulnerability:**

```
🔴 CRITICAL: [package]@[version]
   │
   ├─ Advisory: [CVE-XXXX-XXXXX or GHSA-XXXX-XXXX-XXXX]
   ├─ Title: [vulnerability title]
   ├─ Severity: Critical (CVSS: 9.8)
   ├─ Path: [dependency path if transitive]
   │
   └─ Fix: [npm update package@version] or [manual steps]
```

Group by severity: Critical > High > Moderate > Low

### Step 6: Outdated Packages Summary

```
───────────────────────────────────────────────
   OUTDATED PACKAGES
───────────────────────────────────────────────

Major Updates (3) - Review breaking changes:
  ┌────────────────┬───────────┬───────────┬─────────────┐
  │ Package        │ Current   │ Latest    │ Type        │
  ├────────────────┼───────────┼───────────┼─────────────┤
  │ react          │ 18.2.0    │ 19.1.0    │ dependency  │
  │ typescript     │ 5.3.0     │ 6.0.0     │ devDep      │
  │ drizzle-orm    │ 0.44.0    │ 1.0.0     │ dependency  │
  └────────────────┴───────────┴───────────┴─────────────┘

Minor Updates (5) - Safe, new features
Patch Updates (12) - Recommended

Total outdated: 20 packages
```

### Step 7: Summary and Recommendations

```
───────────────────────────────────────────────
   SUMMARY
───────────────────────────────────────────────

Security:
  🔴 Critical:  1
  🟠 High:      2
  🟡 Moderate:  3
  🔵 Low:       5

Outdated:
  Major:  3 (review before update)
  Minor:  5 (safe to update)
  Patch:  12 (recommended)

═══════════════════════════════════════════════
   RECOMMENDED ACTIONS
═══════════════════════════════════════════════

1. [URGENT] Fix critical vulnerability:
   npm update lodash@4.17.21

2. [HIGH] Run audit fix for compatible updates:
   npm audit fix

3. [MODERATE] Update minor versions:
   npm update

4. [REVIEW] Major updates require manual review:
   - react 18→19: https://react.dev/blog/2024/04/25/react-19
   - typescript 5→6: Check breaking changes

Would you like to:
1. Auto-fix safe updates (minor + patch)
2. View detailed vulnerability info
3. Generate update plan
4. Done

Your choice [1-4]:
```

### Step 8: Auto-Fix Mode (if --fix)

```
═══════════════════════════════════════════════
   AUTO-FIX MODE
═══════════════════════════════════════════════

Will update:
  ✅ 12 patch updates (safe)
  ✅ 5 minor updates (backwards compatible)
  ⏭️  3 major updates (skipped - breaking changes)

Proceed? [Y/n]
```

If confirmed:
```bash
# npm
npm update

# pnpm
pnpm update

# For security fixes
npm audit fix
```

Then verify:
```bash
# Re-run audit to confirm fixes
npm audit
```

---

## Error Handling

**If audit fails:**
```
⚠️  Audit command failed

Error: [error message]

Common causes:
- No package-lock.json (run npm install first)
- Network issues (check connectivity)
- Private registry auth (check .npmrc)

Would you like to:
1. Run npm install first
2. Skip audit and check outdated only
3. Cancel

Your choice [1-3]:
```

**If no vulnerabilities found:**
```
═══════════════════════════════════════════════
   ✅ NO VULNERABILITIES FOUND
═══════════════════════════════════════════════

Security: 0 vulnerabilities
Outdated: [X] packages have updates available

Your dependencies are secure!

Would you like to check for outdated packages? [Y/n]
```

**If fix introduces breaking changes:**
```
⚠️  npm audit fix --force would:

- Update react from 18.2.0 to 19.1.0 (BREAKING)
- Update @types/node from 18.x to 22.x (BREAKING)

This may break your application.

Options:
1. Fix only safe updates (recommended)
2. Force all updates (may break build)
3. Cancel and review manually

Your choice [1-3]:
```

---

## Dependency Path Analysis

For transitive vulnerabilities:

```
Vulnerability in: minimist@1.2.5

Dependency path:
  your-project
  └─ mkdirp@0.5.5
     └─ minimist@1.2.5 (vulnerable)

To fix:
  Option 1: Update mkdirp to latest
            npm update mkdirp

  Option 2: Override transitive dependency
            Add to package.json:
            "overrides": {
              "minimist": "^1.2.8"
            }
```

---

## CI Integration Snippets

**For GitHub Actions:**
```yaml
- name: Audit dependencies
  run: |
    npm audit --audit-level=moderate
    echo "audit_exit_code=$?" >> $GITHUB_OUTPUT
```

**For pre-commit hook:**
```bash
#!/bin/sh
npm audit --audit-level=critical
```

---

## Options Reference

| Option | Description |
|--------|-------------|
| `--security` | Only check security vulnerabilities |
| `--outdated` | Only check outdated packages |
| `--license` | Include license compliance check |
| `--fix` | Auto-fix safe updates |
| `--json` | Output JSON format |
| `--ci` | CI-friendly output (exit codes) |

---

## Important Notes

- **Run after npm install**: Audit needs lock file
- **Transitive deps**: Some fixes require updating parent packages
- **Major updates**: Always review changelogs before updating
- **npm audit fix --force**: Can break your app (use with caution)
- **Private packages**: May need registry auth for full audit

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
