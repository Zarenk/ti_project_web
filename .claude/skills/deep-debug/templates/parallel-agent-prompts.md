# Parallel Agent Prompts

Ready-to-use prompts for the three investigation agents. Copy, paste evidence, and launch.

---

## Agent 1: Execution Tracer (debugger)

```
EVIDENCE:
[Paste network requests / console logs here]

BUG SYMPTOM:
[Describe what's happening]

---

Trace the execution path that leads to this bug:

1. Where does the bug originate? (file:line)
2. What triggers it? (user action, state change, timing)
3. What's the exact sequence of calls?
4. Where could the duplicate/error/issue be introduced?

Focus on TRACING the evidence backward to source code, not guessing.
Report your findings with file paths and line numbers.
```

---

## Agent 2: Pattern Analyzer (code-reviewer)

```
EVIDENCE:
[Paste evidence here]

FILES TO REVIEW:
[List the most relevant files]

---

Analyze these files for common bug patterns that would explain the evidence:

React/Hook Issues:
- useCallback/useMemo with wrong dependencies
- State variables in dependency arrays causing recreation
- Stale closures capturing old values
- useEffect running more times than expected

Async/Timing Issues:
- Race conditions between async operations
- Missing abort/cleanup on unmount
- State updates after unmount

State Management:
- Multiple sources of truth
- Optimistic updates conflicting with server response
- State update ordering problems

Find patterns that EXPLAIN the evidence. Don't just list potential issues - connect them to what we observed.
```

---

## Agent 3: Entry Point Mapper (Explore)

```
EVIDENCE:
[Paste evidence showing the problematic behavior]

FUNCTION/COMPONENT:
[Name the function or component involved]

---

Map all entry points that could trigger [function name]:

1. All places it's called from (grep for function name)
2. All event handlers that might trigger it
3. All useEffect hooks that reference it
4. All state updates that affect it

Looking for:
- Is it being called from multiple places?
- Are there duplicate event handlers?
- Is something triggering it unexpectedly?
- Are there missing guards that should prevent duplicate calls?

Report all call sites with file:line references.
```

---

## How to Use

1. **Gather evidence first** using Chrome tools
2. **Copy the relevant prompt** above
3. **Paste your evidence** into the EVIDENCE section
4. **Launch all three** in a single message:

```
Task(subagent_type="debugger", prompt="[prompt 1 with evidence]")
Task(subagent_type="code-reviewer", prompt="[prompt 2 with evidence]")
Task(subagent_type="Explore", prompt="[prompt 3 with evidence]")
```

5. **Wait for all to complete**
6. **Cross-reference findings** - look for consensus
