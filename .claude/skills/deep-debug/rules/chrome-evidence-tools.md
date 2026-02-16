# Chrome MCP Tools for Evidence Gathering

Use these tools to gather concrete evidence BEFORE forming hypotheses.

## Network Evidence

| Tool | Use For |
|------|---------|
| `mcp__claude-in-chrome__read_network_requests` | All fetch/XHR calls, timing, status codes |

**What to look for:**
- Same URL appearing multiple times → **Duplicate calls bug**
- Failed requests (4xx, 5xx status) → **API/CORS error**
- Unexpected request timing → **Race condition**
- Missing requests → **Call never made**
- Request payload wrong → **Data serialization bug**

**Example finding:**
```
Name: bigcolour (4.6 kB)
Name: bigcolour (3.9 kB)  ← TWO requests = duplicate call bug!
```

## Console Evidence

| Tool | Use For |
|------|---------|
| `mcp__claude-in-chrome__read_console_messages` | Errors, warnings, debug output |

**Useful patterns:**
- `pattern: "error"` - Filter to errors only
- `pattern: "[L2Chat]"` - Filter to app-specific logs
- No pattern - Get everything

**What to look for:**
- Unhandled promise rejections
- React hook warnings
- CORS errors
- "X is undefined" errors

## Page State Evidence

| Tool | Use For |
|------|---------|
| `mcp__claude-in-chrome__read_page` | Current DOM structure |
| `mcp__claude-in-chrome__javascript_tool` | Execute debug code in page context |

**Useful debug snippets:**
```javascript
// Check React state (if using React DevTools)
$r.state

// Check localStorage
JSON.stringify(localStorage)

// Check if element exists
document.querySelectorAll('.some-class').length

// Check event listeners
getEventListeners(document.body)
```

## Evidence Gathering Sequence

1. **First**: `read_network_requests` - Shows API-level issues
2. **Second**: `read_console_messages` - Shows client-side errors
3. **If needed**: `javascript_tool` - Inspect runtime state

## When Evidence Is Sufficient

You have enough evidence when you can answer:
- What action triggers the bug?
- What network requests are made?
- Are there any errors in console?
- What's the timing sequence?

Then launch parallel agents with this evidence attached.
