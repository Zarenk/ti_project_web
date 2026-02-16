# Evidence-First Debugging

## The Anti-Pattern

Going in circles guessing: "Maybe it's caching?" → "Maybe stream parsing?" → "Maybe React re-renders?"

This wastes time because each guess requires:
1. Forming a hypothesis
2. Making a change
3. Testing
4. Finding it didn't work
5. Repeat

## The Pattern

1. **Gather concrete evidence** (Network tab, console logs, page state)
2. **Let evidence guide hypotheses** - the data tells you where to look
3. **Launch parallel agents with evidence attached** - test multiple hypotheses at once

## Corrections

| If doing this... | Do this instead... |
|------------------|-------------------|
| Guessing at causes without data | Use Chrome tools to gather evidence first |
| Trying fixes one at a time | Launch parallel agents to test multiple hypotheses |
| Looking at code without symptoms | Start from observable symptoms, trace backward |
| Assuming you know the cause | Let the Network tab / console prove it |

## Real Example

**Wrong approach** (what we did first):
- "Maybe it's caching" → Disabled caching → Still broken
- "Maybe stream parsing" → Fixed text-end handler → Still broken
- "Maybe React re-renders" → Added logging → Still broken

**Right approach** (what finally worked):
- Looked at Network tab → Saw TWO fetch requests
- That evidence pointed directly to duplicate API calls
- Parallel agents found: `state.messages` in useCallback deps
- Fixed in one attempt

## When to Invoke This Pattern

- You've tried 2+ fixes and nothing worked
- You're not sure what's causing the bug
- The symptom doesn't match your mental model
- You're debugging browser ↔ API interactions
