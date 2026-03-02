import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Transactional client type — works inside $transaction callbacks.
 * Prisma 7 exposes this via Prisma.TransactionClient.
 */
type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Acquires a pessimistic row-level lock (SELECT … FOR UPDATE) within
 * an existing Prisma interactive transaction.
 *
 * @param tx          - The transactional Prisma client (inside $transaction)
 * @param table       - The quoted table name (e.g. "GymMembership")
 * @param id          - Row ID to lock
 * @param companyId   - Tenant isolation (multi-tenant safety)
 * @param options     - Optional: NOWAIT or SKIP LOCKED
 * @returns           - The locked row's id (or null if not found)
 *
 * Usage:
 *   await prisma.$transaction(async (tx) => {
 *     const locked = await acquireLock(tx, 'GymMembership', membershipId, companyId);
 *     if (!locked) throw new NotFoundException(...);
 *     // ... safe to mutate the row
 *   });
 */
export async function acquireLock(
  tx: TxClient,
  table: string,
  id: number,
  companyId: number,
  options?: { mode?: 'WAIT' | 'NOWAIT' | 'SKIP_LOCKED' },
): Promise<{ id: number } | null> {
  const mode = options?.mode ?? 'WAIT';
  const suffix =
    mode === 'NOWAIT'
      ? 'NOWAIT'
      : mode === 'SKIP_LOCKED'
        ? 'SKIP LOCKED'
        : '';

  const query = `SELECT id FROM "${table}" WHERE id = $1 AND "companyId" = $2 FOR UPDATE ${suffix}`;

  const rows = await tx.$queryRawUnsafe<Array<{ id: number }>>(
    query,
    id,
    companyId,
  );

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Acquires pessimistic locks on multiple rows at once.
 * Rows are locked in a consistent order (by id ASC) to prevent deadlocks.
 *
 * @returns Array of locked row ids (may be shorter than input if some rows don't exist)
 */
export async function acquireLockMany(
  tx: TxClient,
  table: string,
  ids: number[],
  companyId: number,
  options?: { mode?: 'WAIT' | 'NOWAIT' | 'SKIP_LOCKED' },
): Promise<Array<{ id: number }>> {
  if (ids.length === 0) return [];

  const mode = options?.mode ?? 'WAIT';
  const suffix =
    mode === 'NOWAIT'
      ? 'NOWAIT'
      : mode === 'SKIP_LOCKED'
        ? 'SKIP LOCKED'
        : '';

  // Sort ids to ensure consistent lock ordering and prevent deadlocks
  const sortedIds = [...ids].sort((a, b) => a - b);

  const placeholders = sortedIds.map((_, i) => `$${i + 2}`).join(', ');
  const query = `SELECT id FROM "${table}" WHERE id IN (${placeholders}) AND "companyId" = $1 ORDER BY id FOR UPDATE ${suffix}`;

  const rows = await tx.$queryRawUnsafe<Array<{ id: number }>>(
    query,
    companyId,
    ...sortedIds,
  );

  return rows;
}
