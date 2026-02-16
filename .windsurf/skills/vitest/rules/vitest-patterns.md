---
globs: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/vitest.config.ts"]
---

# Vitest Pattern Corrections

## Jest to Vitest Migration

| If Claude suggests... | Use instead... |
|----------------------|----------------|
| `jest.fn()` | `vi.fn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `@jest/globals` import | `vitest` import |
| `jest.config.js` | `vitest.config.ts` |

## Mock Path Matching

Vitest mocks must match the exact import path:

```typescript
// ❌ WRONG - path doesn't match import
import { api } from './api';
vi.mock('../api'); // Won't work!

// ✅ CORRECT - path matches import exactly
import { api } from './api';
vi.mock('./api');
```

## vi.mocked for Type Safety

```typescript
// ❌ WRONG - no type safety on mock
vi.mock('./api');
(fetchUser as jest.Mock).mockResolvedValue(data);

// ✅ CORRECT - type-safe mock
vi.mock('./api');
vi.mocked(fetchUser).mockResolvedValue(data);
```

## Globals Configuration

If using `globals: true` in config, add types:

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

## Cleanup Between Tests

```typescript
// ❌ WRONG - mocks persist between tests
vi.mock('./api');

// ✅ CORRECT - reset mocks in beforeEach/afterEach
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

## Async Test Patterns

```typescript
// ❌ WRONG - missing await
it('fetches data', () => {
  expect(fetchData()).resolves.toBe('data'); // Test passes before assertion!
});

// ✅ CORRECT - await the assertion
it('fetches data', async () => {
  await expect(fetchData()).resolves.toBe('data');
});
```

## In-Source Testing Guard

```typescript
// ❌ WRONG - tests included in production build
describe('tests', () => { ... });

// ✅ CORRECT - guarded, tree-shaken in production
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  describe('tests', () => { ... });
}
```

**Last Updated**: 2026-02-06
