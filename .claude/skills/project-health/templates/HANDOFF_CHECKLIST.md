# Session Handoff Checklist

Use this checklist before ending a work session to ensure the next Claude Code session can resume effectively.

## Quick Check (Must Have)

- [ ] **SESSION.md updated** with current state
- [ ] **Next action** is explicitly documented
- [ ] **Blockers** are listed with context
- [ ] **Recent work** is committed with descriptive message

## SESSION.md Template

```markdown
# SESSION.md

**Last Updated**: [date]
**Phase**: [current phase/milestone]

## Current State

[1-2 sentences on where the project is right now]

## In Progress

- [Task 1] - [status/notes]
- [Task 2] - [status/notes]

## Completed This Session

- [x] [Completed item 1]
- [x] [Completed item 2]

## Blocked

- [Blocker 1] - [what's needed to unblock]
- [Blocker 2] - [what's needed]

## Next Actions (Priority Order)

1. [Most important next step]
2. [Second priority]
3. [Third priority]

## Decisions Made

### [Decision Topic]
- **Decision**: [what was decided]
- **Rationale**: [why]
- **Alternatives**: [what else was considered]

## Notes for Next Session

- [Important context that might not be obvious]
- [Gotchas or warnings]
- [References to useful docs/skills]
```

## Detailed Checklist

### State Documentation

- [ ] Current phase/milestone is clear
- [ ] Progress percentage or completion status noted
- [ ] What's actively being worked on is documented
- [ ] What was just completed is listed

### Next Steps

- [ ] Immediate next action is explicit
- [ ] Actions are in priority order
- [ ] Each action has enough context to execute
- [ ] Blocked items are separated from actionable items

### Context Preservation

- [ ] Architectural decisions documented with WHY
- [ ] Alternatives considered are noted
- [ ] Failed approaches are documented (so they're not retried)
- [ ] External dependencies and their states noted

### Code State

- [ ] Working code is committed
- [ ] Commit messages are descriptive
- [ ] No uncommitted experimental code without notes
- [ ] Branch state is documented if using feature branches

### Blockers

- [ ] Each blocker has context (what it blocks, why it's blocked)
- [ ] Workarounds documented if any exist
- [ ] Who/what can unblock it is noted
- [ ] Timeline expectations if known

## Anti-Patterns to Avoid

### Vague State
```markdown
# Bad
"Working on the API"

# Good
"Phase 2: API Implementation - 3/5 endpoints complete.
Currently implementing /api/users with Clerk auth.
Blocked on Clerk API keys (requested 01-28)."
```

### Missing Rationale
```markdown
# Bad
"Using Hono"

# Good
"Using Hono instead of itty-router because:
- Better TypeScript support
- Middleware pattern cleaner for auth
- Matches patterns in skills/hono-routing"
```

### Unclear Next Steps
```markdown
# Bad
"TODO: finish auth"

# Good
"Next: Implement Clerk auth middleware
1. Add @clerk/backend to dependencies
2. Create middleware in src/middleware/auth.ts
3. Apply to /api/users/* routes
4. Test with Clerk dashboard user"
```

### No Commit Context
```markdown
# Bad
git commit -m "updates"

# Good
git commit -m "feat(api): Add /api/users CRUD endpoints

- GET /api/users - list all users
- POST /api/users - create user
- GET /api/users/:id - get single user
- PUT /api/users/:id - update user
- DELETE /api/users/:id - delete user

Still needs: auth middleware, validation"
```

## Quick Commands

### Update SESSION.md before leaving
```bash
# Check what's changed
git status

# Review recent work
git log --oneline -5

# Update SESSION.md with findings
# Then commit the update
git add SESSION.md && git commit -m "docs: Update session state"
```

### Create checkpoint commit
```bash
git add -A && git commit -m "checkpoint: [current state summary]

In progress: [what]
Next: [what]
Blocked: [what, if any]"
```
