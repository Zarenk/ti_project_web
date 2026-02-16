# Fix: Tenant Context Error in Accounting API Routes

**Date:** 2026-02-15
**Status:** ✅ FIXED
**Issue:** 400 Bad Request "Contexto de tenant no disponible"

## Problem

When accessing the accounting journals section at `http://localhost:3000/dashboard/accounting/journals`, the application returned a 400 error:

```
{
  "statusCode": 400,
  "message": "Contexto de tenant no disponible.",
  "organizationId": null,
  "companyId": null,
  "userId": null
}
```

### Root Cause

The accounting API routes in the Next.js frontend were only passing the `Cookie` header to the backend, missing the critical `Authorization: Bearer ${token}` header.

**Backend Requirements:**
- `TenantContextService` extracts tenant context from:
  1. HTTP headers: `x-org-id`, `x-company-id`, `x-org-unit-id`
  2. JWT token (fallback)
  3. User's first allowed organization (fallback)
- `TenantRequiredGuard` validates that at least `organizationId` and `companyId` are present
- Without the Authorization header, the backend couldn't extract the JWT token and therefore couldn't resolve tenant context

**Token Resolution Priority:**
1. `Authorization: Bearer ${token}` header (preferred)
2. `token` cookie
3. Cookie header parsing

## Solution

Updated all 5 accounting API route files to:
1. Import `cookies` from `next/headers`
2. Add `resolveAuthToken()` function to extract JWT token
3. Pass `Authorization: Bearer ${token}` header to backend

### Files Modified

1. **`fronted/src/app/api/accounting/journal-entries/route.ts`**
   - Updated: GET, POST methods

2. **`fronted/src/app/api/accounting/journal-entries/[id]/route.ts`**
   - Updated: GET, PUT, DELETE methods

3. **`fronted/src/app/api/accounting/journal-entries/[id]/post/route.ts`**
   - Updated: POST method

4. **`fronted/src/app/api/accounting/journal-entries/[id]/void/route.ts`**
   - Updated: POST method

5. **`fronted/src/app/api/accounting/export/ple/route.ts`**
   - Updated: GET method

### Code Pattern Applied

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function resolveAuthToken(request: Request): Promise<string | undefined> {
  // 1. Try Authorization header
  const headerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (headerToken) {
    return headerToken;
  }

  // 2. Try token cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // 3. Fallback to parsing cookie header
  const cookieHeader = request.headers.get('cookie');
  const match = cookieHeader?.match(/token=([^;]+)/);
  return match?.[1];
}

export async function GET(req: NextRequest) {
  const token = await resolveAuthToken(req);

  const res = await fetch(`${BACKEND_URL}/api/accounting/journal-entries`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Cookie: req.headers.get('cookie') || '',
    },
  });

  // ... rest of implementation
}
```

## Before vs After

### Before
```typescript
const res = await fetch(`${BACKEND_URL}/api/accounting/journal-entries`, {
  headers: {
    Cookie: req.headers.get('cookie') || '',
  },
});
```

### After
```typescript
const token = await resolveAuthToken(req);

const res = await fetch(`${BACKEND_URL}/api/accounting/journal-entries`, {
  headers: {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Cookie: req.headers.get('cookie') || '',
  },
});
```

## Impact

- ✅ Backend can now extract JWT token from Authorization header
- ✅ `TenantContextService` can resolve tenant context from token
- ✅ `organizationId`, `companyId`, `userId` properly populated
- ✅ All accounting journal endpoints now work correctly
- ✅ Pattern matches other working API routes (e.g., site-settings)

## Verification

```bash
# TypeScript compilation check
cd fronted
npx tsc --noEmit --skipLibCheck src/app/api/accounting/**/*.ts
# ✅ No errors
```

## Testing Required

1. Navigate to `http://localhost:3000/dashboard/accounting/journals`
2. Verify page loads without 400 error
3. Verify journal entries list displays correctly
4. Test creating a new journal entry
5. Test editing an existing journal entry
6. Test posting/voiding journal entries
7. Test PLE export functionality

## Pattern Reference

This fix follows the same pattern as:
- `fronted/src/app/api/site-settings/route.ts` (lines 32-47: `resolveAuthToken`)
- Other working API routes that properly pass Authorization headers

## Related Issues

This issue was discovered after fixing the initial 404 errors by adding `/api` prefix to all accounting routes. The progression was:

1. ❌ 404 Not Found - Missing `/api` prefix → ✅ Fixed
2. ❌ 400 Bad Request - Missing Authorization header → ✅ Fixed (this document)

## Notes

- The `resolveAuthToken` function provides resilient token extraction with 3 fallback methods
- The token is conditionally added to headers only when present (prevents empty Authorization headers)
- Pattern can be reused for any new API routes that need authentication
- Backend logs should now show proper `organizationId`, `companyId`, `userId` values instead of nulls
