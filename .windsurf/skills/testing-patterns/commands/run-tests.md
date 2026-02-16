# Run Tests

Execute test specs via testing agent(s) and report results.

---

## Command Usage

`/run-tests [spec-file]`

- All tests: `/run-tests`
- Specific spec: `/run-tests tests/specs/mcp-tools.yaml`
- Pattern: `/run-tests api` (runs all specs containing "api")

---

## Your Task

Find test specs, spawn testing agent(s) to execute them, and report results.

### Step 1: Find Test Specs

```bash
# Find all YAML test specs
find tests -name "*.yaml" -o -name "*.yml" 2>/dev/null
```

If argument provided, filter:
- Exact file: use that file only
- Pattern: match against filenames

### Step 2: Check Prerequisites

**Test specs exist?**

If no specs found:
```
⚠️  No test specs found in tests/

Run /create-tests first to generate test specs.

Or create tests manually at:
  tests/specs/your-tests.yaml

Would you like me to run /create-tests now?
```

**Testing agent exists?**

Check for `.claude/agents/test-runner.md`:

If missing:
```
⚠️  Testing agent not found at .claude/agents/test-runner.md

Options:
1. Create testing agent now (recommended)
2. Run tests without dedicated agent (uses main context)

Your choice [1-2]:
```

### Step 3: Count Tests and Plan Execution

Parse YAML specs to count total tests:

```
Found test specs:
  tests/specs/mcp-tools.yaml     (12 tests)
  tests/specs/api-endpoints.yaml (8 tests)
  tests/specs/cli-commands.yaml  (5 tests)
  ─────────────────────────────────────────
  Total: 25 tests
```

**Execution strategy:**

| Test Count | Strategy | Rationale |
|------------|----------|-----------|
| 1-20 | Single agent | Efficient, minimal overhead |
| 21-50 | 2 parallel agents | Split by spec file |
| 51+ | 3+ parallel agents | 15-20 tests each |

### Step 4: Spawn Testing Agent(s)

**Single agent execution:**

```
Spawning test-runner agent...

Agent task:
  Read and execute all tests in:
  - tests/specs/mcp-tools.yaml
  - tests/specs/api-endpoints.yaml
  - tests/specs/cli-commands.yaml

  Save results to: tests/results/2026-02-03-143022.md
```

Use the Task tool:

```
Task(
  subagent_type: "test-runner",
  prompt: "Execute all tests in tests/specs/*.yaml. For each test:
    1. Read the spec
    2. Call the tool/endpoint with params
    3. Validate response against expectations
    4. Record PASS/FAIL with details

    Save results to tests/results/[timestamp].md

    Return summary: X passed, Y failed, Z skipped"
)
```

**Parallel agent execution (20+ tests):**

```
Spawning 2 parallel test-runner agents...

Agent 1:
  - tests/specs/mcp-tools.yaml (12 tests)

Agent 2:
  - tests/specs/api-endpoints.yaml (8 tests)
  - tests/specs/cli-commands.yaml (5 tests)
```

Launch in single message with multiple Task calls.

### Step 5: Collect and Save Results

Results format (`tests/results/YYYY-MM-DD-HHMMSS.md`):

```markdown
# Test Results

**Date**: 2026-02-03 14:30:22
**Duration**: 45 seconds
**Summary**: 23/25 passed (92%)

## Overview

| Spec File | Passed | Failed | Skipped |
|-----------|--------|--------|---------|
| mcp-tools.yaml | 11 | 1 | 0 |
| api-endpoints.yaml | 7 | 1 | 0 |
| cli-commands.yaml | 5 | 0 | 0 |

## Results by Spec

### mcp-tools.yaml

✅ tool_basic_call - PASSED (0.3s)
✅ tool_with_params - PASSED (0.5s)
✅ tool_search - PASSED (0.4s)
❌ tool_error_handling - FAILED
...

### api-endpoints.yaml

✅ get_items_success - PASSED (0.2s)
❌ post_item_validation - FAILED
...

## Failed Test Details

### tool_error_handling (mcp-tools.yaml)
- **Expected**: `contains: "error"`
- **Actual**: Response was `{"status": "success"}`
- **Suggestion**: Check error handling for invalid input

### post_item_validation (api-endpoints.yaml)
- **Expected**: `status: 400`
- **Actual**: `status: 200`
- **Suggestion**: Validation middleware may not be applied

## Environment

- Node: v20.x
- Platform: linux
- Working Directory: /path/to/project
```

### Step 6: Report to User

```
═══════════════════════════════════════════════
   TEST RESULTS
═══════════════════════════════════════════════

Summary: 23/25 passed (92%)

✅ Passed: 23
❌ Failed: 2
⏭️  Skipped: 0

Duration: 45 seconds

Failed tests:
  1. tool_error_handling (mcp-tools.yaml)
     Expected: contains "error"
     Actual: {"status": "success"}

  2. post_item_validation (api-endpoints.yaml)
     Expected: status 400
     Actual: status 200

Results saved to: tests/results/2026-02-03-143022.md

═══════════════════════════════════════════════
   NEXT STEPS
═══════════════════════════════════════════════

What would you like to do?

1. Investigate failed tests
2. Re-run failed tests only
3. Commit results to git
4. Fix issues and re-run all
5. Done for now

Your choice [1-5]:
```

**If all tests pass:**

```
═══════════════════════════════════════════════
   ✅ ALL TESTS PASSED
═══════════════════════════════════════════════

Summary: 25/25 passed (100%)

Duration: 42 seconds

Results saved to: tests/results/2026-02-03-143022.md

Would you like to commit the results? [Y/n]
```

---

## Error Handling

**If agent times out:**
```
⚠️  Test agent timed out after 5 minutes.

Partial results may be available.
Check: tests/results/

Options:
1. Review partial results
2. Re-run remaining tests
3. Increase timeout and retry

Your choice:
```

**If tool access fails:**
```
❌ Agent reported: "Cannot access MCP tools"

This usually means the testing agent has `tools:` specified.
MCP tools require inheriting from parent (omit tools field).

Fix: Edit .claude/agents/test-runner.md
Remove or comment out the `tools:` line.

Would you like me to fix this?
```

**If spec file has invalid YAML:**
```
❌ Invalid YAML in tests/specs/mcp-tools.yaml

Error: unexpected end of stream at line 15

Fix the syntax error and re-run.
```

---

## Options

### Re-run Failed Tests Only

```bash
/run-tests --failed
```

Reads previous results file, extracts failed test names, runs only those.

### Verbose Output

```bash
/run-tests --verbose
```

Shows each test as it executes (useful for debugging).

### Specific Spec File

```bash
/run-tests tests/specs/mcp-tools.yaml
```

Runs only tests in that file.

---

## Important Notes

- **Agent context preservation**: Tests run in sub-agent, main context stays clean
- **Results are git-friendly**: Markdown files with timestamps
- **Parallel execution**: Enabled for 20+ tests automatically
- **MCP tool inheritance**: Agent MUST omit `tools:` field for MCP access
- **Timestamps**: Results use ISO format for sorting

---

## Quick Reference

| Test Count | Agents | Approximate Time |
|------------|--------|------------------|
| 1-10 | 1 | ~30 seconds |
| 11-20 | 1 | ~1 minute |
| 21-50 | 2 parallel | ~1-2 minutes |
| 51-100 | 3-5 parallel | ~2-3 minutes |

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
