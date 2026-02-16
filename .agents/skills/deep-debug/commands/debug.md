# Debug

Systematic debugging workflow for errors, bugs, and unexpected behavior.

---

## Command Usage

`/debug [error-or-symptom]`

- With error: `/debug TypeError: Cannot read property 'map' of undefined`
- With symptom: `/debug API calls are duplicating`
- Interactive: `/debug` (guides you through describing the issue)

---

## Your Task

Guide the user through systematic debugging: gather evidence, form hypotheses, investigate with parallel agents, and verify fixes.

### Step 1: Understand the Problem

If error/symptom not provided as argument, ask:

```
═══════════════════════════════════════════════
   DEBUG SESSION
═══════════════════════════════════════════════

What are you experiencing?

1. Error message    - TypeError, ReferenceError, etc.
2. Unexpected behavior - "It does X instead of Y"
3. Performance issue - Slow, hanging, timeouts
4. Intermittent bug - Works sometimes, fails sometimes
5. Production issue - Needs safe investigation

Your choice [1-5]:
```

Then gather details:

```
Describe what's happening:
> [User describes the issue]

When did this start?
> [User: "After my last commit" / "Always" / "Randomly"]

Can you reproduce it?
> [User: "Yes, every time" / "Sometimes" / "No"]
```

### Step 2: Gather Evidence (BEFORE Hypothesizing)

**Critical**: Evidence first, hypotheses second. Don't guess until you have data.

**For browser-related bugs**, use Chrome MCP tools:

```
Gathering evidence from browser...

Network requests:
  mcp__claude-in-chrome__read_network_requests

Console messages:
  mcp__claude-in-chrome__read_console_messages

Page state:
  mcp__claude-in-chrome__read_page
```

Report what you find:

```
═══════════════════════════════════════════════
   EVIDENCE GATHERED
═══════════════════════════════════════════════

Network Tab:
  - 2 duplicate POST requests to /api/messages (suspicious!)
  - Both have same payload, 200ms apart
  - No failed requests

Console:
  - Warning: "Maximum update depth exceeded" (React)
  - No errors

Page State:
  - Component mounted correctly
  - State appears correct

Key finding: Duplicate API calls suggest re-render issue
═══════════════════════════════════════════════
```

**For backend bugs**, examine:

```bash
# Recent error logs
tail -50 logs/error.log

# Check git diff for recent changes
git log --oneline -10
git diff HEAD~1

# Database query logs (if applicable)
# Check for slow queries, deadlocks
```

**For runtime errors**, capture:

- Stack trace (full, not truncated)
- Input values that triggered the error
- Environment (Node version, OS, etc.)
- Recent code changes

### Step 3: Form Hypotheses

Based on evidence, list possible causes:

```
═══════════════════════════════════════════════
   HYPOTHESES (Ranked by Evidence)
═══════════════════════════════════════════════

1. useCallback dependency array includes `state`
   Evidence: Duplicate calls, React update warning
   Confidence: HIGH

2. Component re-mounting on parent state change
   Evidence: Duplicate calls
   Confidence: MEDIUM

3. Event handler attached twice
   Evidence: Duplicate calls (but less likely given pattern)
   Confidence: LOW

Proceeding with parallel investigation...
═══════════════════════════════════════════════
```

### Step 4: Parallel Agent Investigation

Launch 3 agents simultaneously to investigate from different angles:

**Agent 1: Execution Tracer (debugger)**

```
Task(
  subagent_type: "debugger",
  prompt: """
EVIDENCE: [paste gathered evidence]

Trace the execution path that leads to this bug. Find:
1. Where the bug originates
2. What triggers it
3. The exact line/function causing the issue

Focus on TRACING, not guessing. Report the execution flow.
"""
)
```

**Agent 2: Code Pattern Analyzer (code-reviewer)**

```
Task(
  subagent_type: "code-reviewer",
  prompt: """
EVIDENCE: [paste gathered evidence]

Review the relevant code for common bug patterns:
- React useCallback/useMemo dependency issues
- Stale closures
- Race conditions
- State update ordering
- Missing error handling

Find patterns that EXPLAIN the evidence.
"""
)
```

**Agent 3: Entry Point Mapper (Explore)**

```
Task(
  subagent_type: "Explore",
  prompt: """
EVIDENCE: [paste gathered evidence]

Map all entry points that could trigger this behavior:
- All places [function] is called
- All event handlers involved
- All state updates that affect this

Find if something is being called MULTIPLE TIMES or from UNEXPECTED places.
"""
)
```

Tell the user:

```
═══════════════════════════════════════════════
   INVESTIGATING
═══════════════════════════════════════════════

Launched 3 parallel investigation agents:

[1] Execution Tracer   - Tracing code path to bug
[2] Pattern Analyzer   - Checking for known bug patterns
[3] Entry Point Mapper - Finding all trigger points

This typically takes 30-60 seconds...
═══════════════════════════════════════════════
```

### Step 5: Cross-Reference Findings

When agents return, synthesize:

| Signal | Action |
|--------|--------|
| All 3 agree | High confidence - proceed to fix |
| 2 agree, 1 different | Investigate the difference |
| All 3 different | Need more evidence - gather more |

```
═══════════════════════════════════════════════
   INVESTIGATION RESULTS
═══════════════════════════════════════════════

Agent 1 (Execution Tracer):
  Root cause: `state.messages` in useCallback deps
  Location: src/components/Chat.tsx:45

Agent 2 (Pattern Analyzer):
  Root cause: useCallback dependency causing recreation
  Pattern: React re-render loop (documented pattern)

Agent 3 (Entry Point Mapper):
  Found: sendMessage called from 2 places
  But both are legitimate (button + enter key)
  Ruled out: Double-mounting, duplicate handlers

═══════════════════════════════════════════════
   CONSENSUS: useCallback dependency issue
═══════════════════════════════════════════════

Confidence: HIGH (3/3 agents agree)

Root Cause:
  `sendMessage` useCallback has `state.messages` in deps.
  Every state update recreates the callback.
  During React re-render, duplicate calls occur.

Location: src/components/Chat.tsx:45

Fix:
  Use ref to access current state without dependency:

  const stateRef = useRef(state);
  stateRef.current = state;

  const sendMessage = useCallback(async (text) => {
    const messages = stateRef.current.messages;
    // ...
  }, []); // Remove state.messages from deps

Would you like me to apply this fix? [Y/n]
═══════════════════════════════════════════════
```

### Step 6: Apply and Verify Fix

If user approves:

1. **Apply the fix**
2. **Re-gather the same evidence** to confirm:
   - Network tab: No more duplicates
   - Console: Warning gone
   - User action: Works correctly

```
═══════════════════════════════════════════════
   FIX APPLIED
═══════════════════════════════════════════════

Changes made:
  - src/components/Chat.tsx (lines 43-55)

Verification:
  ✅ Network: Single API call (was: 2 duplicate)
  ✅ Console: No React warnings
  ✅ Behavior: Message sent once

The bug is fixed!

Would you like to:
1. Commit this fix
2. Add a regression test
3. Document the root cause
4. Done

Your choice [1-4]:
═══════════════════════════════════════════════
```

---

## Evidence Gathering Quick Reference

| Bug Type | Primary Evidence Source | Tools |
|----------|------------------------|-------|
| Browser/UI | Network tab, Console | `read_network_requests`, `read_console_messages` |
| API/Backend | Error logs, Request payloads | `Bash`, `Read` |
| Database | Query logs, Deadlocks | `Bash`, `Read` |
| Performance | Profiler, Timing | `read_network_requests`, Bash profilers |
| State/React | Console warnings, Re-renders | `read_console_messages`, DevTools |

---

## Common Bug Patterns

### React Hook Issues
- `state` in useCallback dependencies → callback recreation → duplicate calls
- Missing dependencies → stale closures → wrong values
- useEffect running multiple times → check deps array

### API/Network Issues
- Duplicate requests → check re-renders, event handlers
- Race conditions → check async handling, AbortController
- CORS failures → check server headers, credentials mode

### State Management Issues
- State not updating → check immutability, spread operators
- Stale state in callbacks → use refs or functional updates
- Multiple sources of truth → consolidate state

---

## Error Handling

**If no evidence can be gathered:**
```
⚠️  Unable to gather evidence automatically.

Please provide:
1. Full error message and stack trace
2. Steps to reproduce
3. Code snippet where error occurs

Paste the error here:
>
```

**If agents return conflicting results:**
```
⚠️  Agents returned different conclusions.

Agent 1: [result]
Agent 2: [result]
Agent 3: [result]

This suggests:
- The bug may have multiple contributing factors
- Need more evidence to narrow down

Options:
1. Gather more evidence (specify what)
2. Investigate each hypothesis separately
3. Add logging to isolate the issue

Your choice [1-3]:
```

**If fix doesn't resolve the issue:**
```
⚠️  Verification failed - issue persists.

Evidence after fix:
  - [still seeing problem]

This suggests:
- Root cause was misidentified
- There may be multiple bugs
- Fix was incomplete

Re-running investigation with new evidence...
```

---

## Important Notes

- **Evidence first**: Never guess before gathering data
- **Parallel investigation**: 3 perspectives faster than 1 sequential
- **Verify fixes**: Always confirm with same evidence that found the bug
- **Document learnings**: Good bugs become regression tests
- **Chrome tools**: Most powerful for frontend bugs (Network, Console, DOM)

---

## Related Resources

- `templates/parallel-agent-prompts.md` - Agent prompt templates
- `templates/investigation-report.md` - Report format
- `rules/evidence-first.md` - Why evidence matters
- `rules/chrome-evidence-tools.md` - Browser evidence gathering

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
