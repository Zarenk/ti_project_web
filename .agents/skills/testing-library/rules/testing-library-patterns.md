---
globs: ["**/*.test.tsx", "**/*.test.jsx", "**/*.spec.tsx", "**/test/*.tsx"]
---

# Testing Library Pattern Corrections

## Query Priority

| If Claude suggests... | Use instead... |
|----------------------|----------------|
| `getByTestId('submit')` | `getByRole('button', { name: /submit/i })` |
| `container.querySelector('.btn')` | `screen.getByRole('button')` |
| `getByText('Submit')` (for button) | `getByRole('button', { name: /submit/i })` |

## Async Testing

```typescript
// ❌ WRONG - getBy doesn't wait
const modal = screen.getByRole('dialog');

// ✅ CORRECT - findBy waits for element
const modal = await screen.findByRole('dialog');
```

## User Event Setup

```typescript
// ❌ WRONG - deprecated direct call
import userEvent from '@testing-library/user-event';
userEvent.click(button);

// ✅ CORRECT - setup() first, then await
const user = userEvent.setup();
await user.click(button);
```

## fireEvent vs userEvent

| If Claude suggests... | Use instead... |
|----------------------|----------------|
| `fireEvent.click(button)` | `await user.click(button)` |
| `fireEvent.change(input, { target: { value: 'x' } })` | `await user.type(input, 'x')` |
| `fireEvent.keyDown(input, { key: 'Enter' })` | `await user.keyboard('{Enter}')` |

**Why?** userEvent simulates real user behavior (focus, hover, then click) while fireEvent just dispatches a single event.

## Checking Element Not Exists

```typescript
// ❌ WRONG - throws if not found
expect(screen.getByRole('dialog')).not.toBeInTheDocument();

// ✅ CORRECT - returns null if not found
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
```

## Awaiting Assertions

```typescript
// ❌ WRONG - missing await
expect(screen.findByText('Hello')).toBeInTheDocument();

// ✅ CORRECT - await the findBy
expect(await screen.findByText('Hello')).toBeInTheDocument();
```

## waitFor Usage

```typescript
// ❌ WRONG - side effects in waitFor callback
await waitFor(() => {
  user.click(button); // Don't do this!
  expect(result).toBeInTheDocument();
});

// ✅ CORRECT - only assertions in waitFor
await user.click(button);
await waitFor(() => {
  expect(result).toBeInTheDocument();
});
```

## Cleanup

Testing Library auto-cleans in modern versions, but if using Vitest:

```typescript
// src/test/setup.ts
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

**Last Updated**: 2026-02-06
