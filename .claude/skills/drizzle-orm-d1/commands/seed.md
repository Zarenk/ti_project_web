# Seed

Seed D1 database with initial or test data using Drizzle ORM.

---

## Command Usage

`/seed [options]`

- Run seed: `/seed` (runs default seed file)
- Create seed file: `/seed --init`
- Run with truncate: `/seed --reset` (clears tables first)
- Specific file: `/seed scripts/seed-users.ts`

---

## Your Task

Help the user seed their D1 database. Create seed files if they don't exist, run seeds safely, and handle D1's parameter limits.

### Step 1: Check for Existing Seed File

```bash
# Common seed file locations
ls src/db/seed.ts db/seed.ts scripts/seed.ts seed.ts 2>/dev/null
```

If no seed file exists:
```
═══════════════════════════════════════════════
   DATABASE SEEDING
═══════════════════════════════════════════════

No seed file found.

Would you like me to create one?

1. Create seed file with example data
2. Create empty seed template
3. Specify custom location

Your choice [1-3]:
```

### Step 2: Create Seed File (if needed)

Create `src/db/seed.ts`:

```typescript
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

// D1 has a 100-parameter limit per query
// Chunk large inserts to avoid "too many SQL variables" error
const D1_CHUNK_SIZE = 30; // Safe for 3-column tables (30 * 3 = 90 params)

async function chunkInsert<T>(
  db: ReturnType<typeof drizzle>,
  table: any,
  items: T[],
  chunkSize = D1_CHUNK_SIZE
) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await db.insert(table).values(chunk);
    console.log(`Inserted ${Math.min(i + chunkSize, items.length)}/${items.length}`);
  }
}

export async function seed(db: ReturnType<typeof drizzle>) {
  console.log('🌱 Seeding database...');

  // Example: Seed users
  const users = [
    { email: 'admin@example.com', name: 'Admin User' },
    { email: 'user1@example.com', name: 'Test User 1' },
    { email: 'user2@example.com', name: 'Test User 2' },
  ];

  await chunkInsert(db, schema.users, users);
  console.log(`✅ Seeded ${users.length} users`);

  // Add more seed data here...

  console.log('🌱 Seeding complete!');
}

// Run seed directly (for local dev)
// npx wrangler d1 execute <db-name> --local --file=src/db/seed.ts
```

### Step 3: Create Seed Runner Script

Create `scripts/run-seed.ts`:

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { seed } from '../src/db/seed';
import * as schema from '../src/db/schema';

// For local development using SQLite directly
async function main() {
  // Path to local D1 database
  const dbPath = '.wrangler/state/v3/d1/<database-id>/db.sqlite';

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });

  try {
    await seed(db);
    console.log('✅ Seed complete');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

main();
```

Add to `package.json`:
```json
{
  "scripts": {
    "db:seed": "tsx scripts/run-seed.ts",
    "db:seed:reset": "npm run db:seed -- --reset"
  }
}
```

### Step 4: Run Seed

```
═══════════════════════════════════════════════
   RUNNING SEED
═══════════════════════════════════════════════

Seed file: src/db/seed.ts
Target: Local D1 database

Running seed...

🌱 Seeding database...
  Inserted 3/3 users
  Inserted 10/10 posts
  Inserted 25/25 comments
🌱 Seeding complete!

═══════════════════════════════════════════════
   SEED COMPLETE
═══════════════════════════════════════════════

Records created:
  - users: 3
  - posts: 10
  - comments: 25

Total: 38 records

Would you like to:
1. View seeded data
2. Seed remote database
3. Done

Your choice [1-3]:
```

### Step 5: Seed Remote (with confirmation)

```
⚠️  Seeding PRODUCTION database

This will insert data into your remote D1 database.

Tables to seed:
  - users (3 records)
  - posts (10 records)
  - comments (25 records)

Continue? [y/N]:
```

---

## Reset Mode

When `/seed --reset`:

```
⚠️  RESET MODE

This will:
1. TRUNCATE all seeded tables
2. Re-insert seed data

Data in these tables will be DELETED:
  - users
  - posts
  - comments

Type "reset" to confirm:
```

Then run:
```typescript
// Truncate in correct order (respect foreign keys)
await db.delete(schema.comments);
await db.delete(schema.posts);
await db.delete(schema.users);

// Re-seed
await seed(db);
```

---

## D1 Parameter Limit Handling

**Critical**: D1 has a 100-parameter limit per query. The seed template includes chunking.

```
⚠️  D1 Parameter Limit

Your seed has 150 records × 3 columns = 450 parameters

This exceeds D1's 100-parameter limit.

Automatically chunking into batches of 30 records...
  Batch 1/5: Inserted 30 records
  Batch 2/5: Inserted 30 records
  Batch 3/5: Inserted 30 records
  Batch 4/5: Inserted 30 records
  Batch 5/5: Inserted 30 records

✅ All 150 records inserted successfully
```

---

## Error Handling

**If foreign key constraint fails:**
```
❌ Seed failed

Error: FOREIGN KEY constraint failed

This usually means:
  - Referenced record doesn't exist
  - Seed order is wrong (insert parent before child)

Fix: Ensure parent tables are seeded before child tables.
```

**If unique constraint fails:**
```
❌ Seed failed

Error: UNIQUE constraint failed: users.email

This usually means:
  - Seed data already exists
  - Running seed multiple times

Fix: Use /seed --reset to clear existing data first.
```

**If parameter limit exceeded:**
```
❌ Seed failed

Error: too many SQL variables

Your seed exceeds D1's 100-parameter limit.
Use the chunkInsert helper from the seed template.
```

---

## Seed Data Patterns

### Factory Pattern (for large datasets)

```typescript
function createUser(index: number) {
  return {
    email: `user${index}@example.com`,
    name: `User ${index}`,
    createdAt: new Date(),
  };
}

const users = Array.from({ length: 100 }, (_, i) => createUser(i + 1));
await chunkInsert(db, schema.users, users);
```

### Realistic Fake Data

```typescript
// Using faker (npm install @faker-js/faker)
import { faker } from '@faker-js/faker';

const users = Array.from({ length: 50 }, () => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  createdAt: faker.date.past(),
}));
```

### Environment-Specific Seeds

```typescript
const environment = process.env.NODE_ENV || 'development';

if (environment === 'development') {
  // Seed with test data
  await seedTestUsers(db);
} else if (environment === 'production') {
  // Seed only essential data (admin user, etc.)
  await seedAdminUser(db);
}
```

---

## Important Notes

- **Chunk large inserts**: D1 has 100-parameter limit
- **Order matters**: Seed parent tables before child tables
- **Idempotency**: Use upsert or check existence before insert
- **Local first**: Test seeds locally before running on remote
- **Don't seed production carelessly**: Confirm before inserting into remote

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
