# Bug Investigation Report

Use this template to document deep-debug investigations for future reference.

---

## Problem Summary

- **Symptom**: [What the bug looks like to users]
- **Impact**: [Who/what is affected, severity]
- **Frequency**: [Always, sometimes, specific conditions]
- **First noticed**: [When did this start?]

---

## Evidence Gathered

### Network Tab
```
[Paste relevant network requests]
[Note: duplicates, failures, timing issues]
```

### Console Logs
```
[Paste relevant errors/warnings]
```

### Page State
```
[Any relevant DOM or app state observations]
```

### Key Observation
> [The single most important piece of evidence that pointed to the root cause]

---

## Hypotheses Tested

Before parallel investigation, what was tried?

| Hypothesis | Test | Result |
|------------|------|--------|
| [e.g., Caching issue] | [Disabled cache] | [Still broken] |
| [e.g., Stream parsing] | [Fixed text-end] | [Still broken] |

---

## Parallel Investigation Results

| Agent | Finding | Confidence |
|-------|---------|------------|
| debugger | [What it found] | [High/Med/Low] |
| code-reviewer | [What it found] | [High/Med/Low] |
| Explore | [What it found] | [High/Med/Low] |

### Consensus
[What did multiple agents agree on?]

### Disagreements
[Any conflicting findings? How were they resolved?]

---

## Root Cause

**Technical explanation:**
[What was actually causing the bug]

**Why it wasn't obvious:**
[Why initial hypotheses missed this]

**Pattern to watch for:**
[How to recognize this bug pattern in the future]

---

## Fix Applied

**Files modified:**
- `path/to/file.ts` - [What changed]
- `path/to/other.ts` - [What changed]

**Code change:**
```diff
- [old code]
+ [new code]
```

**Why this fixes it:**
[Explain the connection between fix and root cause]

---

## Verification

**Evidence after fix:**
- Network tab shows: [Expected behavior]
- Console shows: [No errors / expected logs]
- User experience: [Bug no longer occurs]

**Regression risk:**
[Any concerns about the fix causing other issues?]

---

## Lessons Learned

1. [What to do differently next time]
2. [Pattern to add to rules/knowledge base]
3. [Tools/techniques that helped]

---

## Time Spent

- Initial guessing: [X minutes]
- Evidence gathering: [X minutes]
- Parallel investigation: [X minutes]
- Fix implementation: [X minutes]
- **Total**: [X minutes]

*Note: Evidence-first approach typically saves 50%+ of debugging time.*
