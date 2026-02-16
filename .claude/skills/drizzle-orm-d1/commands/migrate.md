# Migrate

Run Drizzle ORM migrations for D1 database.

---

## Command Usage

`/migrate [options]`

- Generate & apply: `/migrate` (interactive)
- Generate only: `/migrate --generate`
- Apply local: `/migrate --local`
- Apply remote: `/migrate --remote`
- Check status: `/migrate --status`

---

## Your Task

Manage D1 database migrations through Drizzle Kit. Guide the user through a safe migration workflow.

### Step 1: Discover Project State

Check for Drizzle configuration:

```bash
# Find Drizzle config
ls drizzle.config.ts drizzle.config.js 2>/dev/null

# Find schema location
grep -l "sqliteTable\|integer\|text" src/**/*.ts 2>/dev/null | head -3

# Check existing migrations
ls -la migrations/ drizzle/ 2>/dev/null | head -10
```

If no config found:
```
⚠️  Drizzle not configured in this project.

Run /db-init first to set up Drizzle ORM with D1.
```

### Step 2: Check for Schema Changes

```bash
# Check what migrations would be generated
npx drizzle-kit generate --dry-run 2>&1
```

Report the status:

```
═══════════════════════════════════════════════
   MIGRATION STATUS
═══════════════════════════════════════════════

Schema file: src/db/schema.ts
Migrations directory: ./migrations

Pending changes detected:
  + CREATE TABLE posts (id, title, content, authorId, createdAt)
  + CREATE INDEX idx_posts_author ON posts(authorId)
  ~ ALTER TABLE users ADD COLUMN avatarUrl TEXT

Existing migrations:
  ✅ 0001_init.sql (applied)
  ✅ 0002_add_comments.sql (applied)

What would you like to do?

1. Generate new migration
2. Apply pending migrations (local)
3. Apply pending migrations (remote)
4. View migration details
5. Cancel

Your choice [1-5]:
```

### Step 3: Generate Migration

If user chooses to generate:

```bash
# Generate migration with timestamp
npx drizzle-kit generate --name=$(date +%Y%m%d_%H%M%S)
```

Show the generated SQL:

```
═══════════════════════════════════════════════
   MIGRATION GENERATED
═══════════════════════════════════════════════

File: migrations/0003_20260203_143022.sql

┌──────────────────────────────────────────────┐
│ -- Migration: 0003_20260203_143022           │
│                                              │
│ CREATE TABLE posts (                         │
│   id INTEGER PRIMARY KEY AUTOINCREMENT,      │
│   title TEXT NOT NULL,                       │
│   content TEXT,                              │
│   authorId INTEGER REFERENCES users(id),     │
│   createdAt INTEGER DEFAULT (unixepoch())    │
│ );                                           │
│                                              │
│ CREATE INDEX idx_posts_author ON posts(authorId);│
└──────────────────────────────────────────────┘

⚠️  REVIEW CAREFULLY before applying:
  - No destructive changes detected ✅
  - Foreign key constraint on authorId

Apply this migration? [Y/n]
```

### Step 4: Check for Dangerous Changes

**Before applying, scan for destructive operations:**

```bash
grep -iE "DROP|DELETE|TRUNCATE|ALTER.*DROP" migrations/*.sql
```

If destructive changes found:
```
⚠️  DESTRUCTIVE CHANGES DETECTED

The following operations will cause data loss:

🔴 DROP TABLE comments;
🔴 ALTER TABLE users DROP COLUMN legacyId;

This will permanently delete:
  - All rows in 'comments' table
  - Data in 'legacyId' column for all users

Are you SURE you want to proceed? Type "yes I understand" to continue:
```

### Step 5: Apply Migrations - Local First

**Always test locally before production:**

```bash
# Apply to local D1
npx wrangler d1 migrations apply <database-name> --local
```

Report results:

```
═══════════════════════════════════════════════
   LOCAL MIGRATION
═══════════════════════════════════════════════

Database: my-database (local)
Migration: 0003_20260203_143022.sql

Applying... ✅ Success!

Verification:
  Tables: users, posts, comments (3 total)
  New table 'posts': ✅ Created
  Index 'idx_posts_author': ✅ Created

Local database is up to date.

Apply to remote database? [Y/n]
```

### Step 6: Apply Migrations - Remote

```bash
# Apply to production D1
npx wrangler d1 migrations apply <database-name> --remote
```

Report results:

```
═══════════════════════════════════════════════
   REMOTE MIGRATION
═══════════════════════════════════════════════

Database: my-database (remote)
Migration: 0003_20260203_143022.sql

Applying... ✅ Success!

Verification:
  Tables: users, posts, comments (3 total)
  Rows affected: 0 (schema-only change)

✅ Production database updated successfully!

═══════════════════════════════════════════════
   MIGRATION COMPLETE
═══════════════════════════════════════════════

Applied: 0003_20260203_143022.sql

Local:  ✅ Applied
Remote: ✅ Applied

Your database schema is now in sync.
```

---

## Status Check Mode

When `/migrate --status`:

```
═══════════════════════════════════════════════
   DATABASE MIGRATION STATUS
═══════════════════════════════════════════════

Schema: src/db/schema.ts
Config: drizzle.config.ts

Local Database:
  Name: my-database
  Tables: users, posts, comments (3)
  Migrations applied: 3

Remote Database:
  Name: my-database
  Tables: users, posts, comments (3)
  Migrations applied: 3

Migration Files:
  ✅ 0001_init.sql
  ✅ 0002_add_comments.sql
  ✅ 0003_20260203_143022.sql

Status: ✅ Schema in sync (no pending changes)
```

---

## Error Handling

**If migration fails locally:**
```
❌ Local migration failed

Error: UNIQUE constraint failed: users.email

This usually means:
  - Duplicate data exists that violates the new constraint
  - Schema drift between code and database

Options:
1. Fix the data and retry
2. Roll back the migration
3. View detailed error

Your choice [1-3]:
```

**If remote fails but local succeeded:**
```
⚠️  Remote migration failed (local succeeded)

Error: table "posts" already exists

Databases are now out of sync!

Options:
1. Check remote table schema (may be from manual changes)
2. Force apply (dangerous - may lose data)
3. Abort and investigate

Your choice [1-3]:
```

**If Drizzle 1.0 nested migration issue detected:**
```
⚠️  Nested migration folders detected

Drizzle 1.0 generates migrations in subfolders:
  migrations/0003_random/migration.sql

But wrangler expects flat structure:
  migrations/0003_random.sql

Flattening migrations automatically...
```

Then run the flatten script from Issue #18.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `/migrate` | Interactive migration workflow |
| `/migrate --generate` | Generate migration only, don't apply |
| `/migrate --local` | Apply pending migrations to local D1 |
| `/migrate --remote` | Apply pending migrations to remote D1 |
| `/migrate --status` | Show migration status |
| `/migrate --rollback` | Show rollback guidance (manual) |

---

## Important Notes

- **Local first**: Always apply to local before remote
- **Review SQL**: Always review generated migrations before applying
- **No auto-rollback**: D1/SQLite doesn't support transactional DDL - migrations are atomic
- **Backup production**: For destructive changes, backup data first
- **Drizzle Kit vs Wrangler**: Use `drizzle-kit generate` then `wrangler d1 migrations apply`

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
