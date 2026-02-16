# Parallel Agent Coordination

Launch three agents simultaneously, each with a different investigative perspective.

## The Three Perspectives

| Agent | Role | What It Finds |
|-------|------|---------------|
| `debugger` | Execution Tracer | Where bug originates, what triggers it, call sequence |
| `code-reviewer` | Pattern Analyzer | Common anti-patterns, code smells, known bug patterns |
| `Explore` | Entry Point Mapper | All call sites, unexpected callers, duplicate triggers |

## Why Parallel?

- **Faster**: 3 hypotheses tested in the time of 1
- **Different perspectives**: One agent might miss what another catches
- **Cross-validation**: Agreement = confidence

## Prompt Requirements

Each agent prompt MUST include:

1. **The evidence** - Paste network/console output directly
2. **Specific focus** - What this agent should investigate
3. **Agreement request** - Ask if findings align with evidence

**Bad prompt:**
> "Debug this bug"

**Good prompt:**
> "EVIDENCE: Network tab shows 2 fetch requests for same URL.
> Trace the execution path from user click to API call.
> Find where/why the call is made twice."

## Launching Agents

Use a single message with multiple Task tool calls:

```
Task(subagent_type="debugger", prompt="EVIDENCE: [paste]...")
Task(subagent_type="code-reviewer", prompt="EVIDENCE: [paste]...")
Task(subagent_type="Explore", prompt="EVIDENCE: [paste]...")
```

## Cross-Reference Signals

| Finding Pattern | Confidence | Action |
|-----------------|------------|--------|
| All 3 agents agree on root cause | **High** | Implement fix |
| 2 agree, 1 finds something different | **Medium** | Investigate the difference |
| All 3 find different things | **Low** | Need more evidence |
| None find anything | **Blocked** | Wrong area - gather new evidence |

## Common Findings by Agent

### debugger typically finds:
- Exact line/function causing issue
- Trigger sequence (click → handler → API call → duplicate)
- Timing-related bugs

### code-reviewer typically finds:
- React useCallback/useMemo dependency issues
- Stale closure bugs
- Missing error handling
- Race conditions

### Explore typically finds:
- Function called from multiple places
- Missing guards/early returns
- Unexpected event handlers
- Duplicate registrations

## After Agents Complete

1. **Read all three findings**
2. **Identify consensus** - What do they agree on?
3. **Investigate disagreements** - Sometimes the outlier is right
4. **Implement fix** based on consensus
5. **Verify** using same evidence tools (Network tab should show fix worked)
