# Create Tests

Generate test specs and a testing agent for the current project.

---

## Command Usage

`/create-tests [test-type]`

- With type: `/create-tests mcp` or `/create-tests api`
- Without type: `/create-tests` (interactive discovery)

---

## Your Task

Discover testable components in the project, generate YAML test specs, and create a testing agent.

### Step 1: Discover Project Structure

Search for testable components:

```bash
# MCP servers
ls .mcp.json mcp.json 2>/dev/null

# API routes (common patterns)
find . -name "*.ts" -path "*/routes/*" 2>/dev/null | head -5
grep -r "app\.\(get\|post\|put\|delete\)" --include="*.ts" -l 2>/dev/null | head -5

# Existing test frameworks
ls vitest.config.* jest.config.* pytest.ini pyproject.toml 2>/dev/null

# CLI tools
ls bin/ 2>/dev/null
grep '"bin"' package.json 2>/dev/null

# Browser/UI (playwright or browser MCP)
ls playwright.config.* 2>/dev/null
```

**Categorise what you find:**

| Found | Test Type | Tools Needed |
|-------|-----------|--------------|
| `.mcp.json` / `mcp.json` | MCP | Inherit (omit tools field) |
| Route files / Hono/Express | API | `WebFetch` |
| `playwright.config.*` | Browser | Inherit (Playwright MCP) |
| `vitest.config.*` / `jest.config.*` | Framework | `Bash` |
| `bin/` directory | CLI | `Bash`, `Read` |

### Step 2: Ask Clarifying Questions

If test type not provided as argument:

```
═══════════════════════════════════════════════
   CREATE TESTS
═══════════════════════════════════════════════

I found these testable components:

✅ MCP Server: web-scraper-mcp (3 tools)
✅ API Routes: /api/users, /api/items (5 endpoints)
⬜ Browser: No playwright config found
⬜ CLI: No bin/ directory

What would you like to test?

1. MCP tools     - Test MCP server tools directly
2. API endpoints - Test HTTP endpoints with WebFetch
3. Browser flows - Test UI interactions
4. CLI commands  - Test command-line tools
5. All of above  - Generate tests for everything found

Your choice [1-5]:
```

Then ask:

```
Include edge cases and error scenarios? [Y/n]
```

### Step 3: Generate Test Specs

Create `tests/specs/` directory and YAML files:

```bash
mkdir -p tests/specs tests/results
```

**For MCP tests** (`tests/specs/mcp-tools.yaml`):

```yaml
name: MCP Tool Tests
description: Validate MCP server tool functionality

defaults:
  timeout: 10000

tests:
  - name: tool_basic_call
    description: Verify basic tool invocation
    tool: mcp__server__tool_name
    params:
      action: list
    expect:
      status: success

  - name: tool_with_params
    description: Verify tool with parameters
    tool: mcp__server__tool_name
    params:
      action: search
      query: "test"
    expect:
      contains: "results"
      count_gte: 0
```

**For API tests** (`tests/specs/api-endpoints.yaml`):

```yaml
name: API Endpoint Tests
description: Validate HTTP endpoint responses

defaults:
  base_url: http://localhost:8787
  timeout: 5000

tests:
  - name: get_items_success
    description: GET /api/items returns list
    method: GET
    path: /api/items
    expect:
      status: 200
      type: array

  - name: post_item_validation
    description: POST /api/items validates input
    method: POST
    path: /api/items
    body:
      name: ""
    expect:
      status: 400
      contains: "required"
```

**For CLI tests** (`tests/specs/cli-commands.yaml`):

```yaml
name: CLI Command Tests
description: Validate CLI tool behavior

defaults:
  timeout: 30000

tests:
  - name: cli_help_flag
    description: --help shows usage
    command: node bin/cli.js --help
    expect:
      contains: "Usage:"
      status: 0

  - name: cli_version_flag
    description: --version shows version
    command: node bin/cli.js --version
    expect:
      matches: "\\d+\\.\\d+\\.\\d+"
```

**For Browser tests** (`tests/specs/browser-flows.yaml`):

```yaml
name: Browser Flow Tests
description: Validate UI interactions

defaults:
  base_url: http://localhost:5173
  timeout: 10000

tests:
  - name: homepage_loads
    description: Homepage renders correctly
    navigate: /
    expect:
      title_contains: "App"
      element_exists: "[data-testid='main']"

  - name: login_flow
    description: User can log in
    steps:
      - navigate: /login
      - fill: { selector: "#email", value: "test@example.com" }
      - fill: { selector: "#password", value: "password" }
      - click: "[type='submit']"
    expect:
      url_contains: /dashboard
```

### Step 4: Create Testing Agent

Generate `.claude/agents/test-runner.md`:

**For MCP tests** (omit tools field):

```markdown
---
name: test-runner
description: |
  Tests project functionality. Reads YAML test specs and validates responses.

  MUST BE USED when: testing after changes, running regression tests.
  Use PROACTIVELY after deploying changes.

  Keywords: test, run tests, validate, regression
# tools field OMITTED - inherits ALL tools from parent session (including MCP)
model: sonnet
---

# Test Runner Agent

## CRITICAL: You HAVE Tool Access

**DO NOT assume you can't call tools. You CAN and MUST call them directly.**

[Include rest of test-agent.md template content, customised for project]
```

**For API/CLI tests** (include specific tools):

```markdown
---
name: test-runner
description: |
  Tests project API endpoints and CLI commands.

  MUST BE USED when: testing after changes, running regression tests.

  Keywords: test, run tests, validate, regression
tools: Read, Glob, Grep, Bash, WebFetch
model: sonnet
---

# Test Runner Agent

[Include test-agent.md template content, customised for project]
```

### Step 5: Output Summary

```
═══════════════════════════════════════════════
   ✅ TESTS CREATED
═══════════════════════════════════════════════

Test Type: [MCP / API / CLI / Browser / Mixed]

Created files:
  tests/
  ├── specs/
  │   ├── mcp-tools.yaml       (12 tests)
  │   ├── api-endpoints.yaml   (8 tests)
  │   └── cli-commands.yaml    (5 tests)
  └── results/                  (empty - results saved here)

  .claude/agents/
  └── test-runner.md           (testing agent)

Total: 25 tests across 3 spec files

═══════════════════════════════════════════════
   NEXT STEPS
═══════════════════════════════════════════════

1. Review generated test specs in tests/specs/
2. Adjust params and expectations as needed
3. Run tests with: /run-tests
4. Commit test files when satisfied

═══════════════════════════════════════════════

Would you like me to run the tests now?
```

---

## Error Handling

**If no testable components found:**
```
⚠️  No testable components discovered.

This project doesn't appear to have:
• MCP server configs (.mcp.json)
• API routes
• Test framework configs
• CLI tools

Options:
1. Specify what to test manually
2. Create tests for a specific file/function
3. Set up a test framework first (vitest, jest)

Your choice:
```

**If tests/ directory already exists:**
```
⚠️  tests/ directory already exists.

Options:
1. Add new specs alongside existing
2. Overwrite existing specs
3. Cancel and review existing tests

Your choice [1-3]:
```

**If .claude/agents/test-runner.md exists:**
```
⚠️  Testing agent already exists at .claude/agents/test-runner.md

Options:
1. Keep existing agent (recommended)
2. Replace with new agent
3. Create with different name (test-runner-v2.md)

Your choice [1-3]:
```

---

## Important Notes

- **MCP tests**: MUST omit `tools` field to inherit MCP tools from parent
- **API tests**: Include `WebFetch` in tools list
- **CLI tests**: Include `Bash`, `Read` in tools list
- **Browser tests**: Omit tools field if using Playwright MCP or claude-in-chrome
- Test specs are YAML for human readability and version control
- Results are saved as markdown for git history

---

## Quick Reference

| Test Type | Spec Template | Agent Tools |
|-----------|---------------|-------------|
| MCP | `mcp-tools.yaml` | Inherit (omit field) |
| API | `api-endpoints.yaml` | `WebFetch` |
| CLI | `cli-commands.yaml` | `Bash`, `Read` |
| Browser | `browser-flows.yaml` | Inherit |

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
