/**
 * Backfill storeId on EntryDetailSeries from Entry.storeId
 *
 * This script populates the new storeId field on existing EntryDetailSeries records
 * by following the chain: EntryDetailSeries → EntryDetail → Entry.storeId
 *
 * Safe to run multiple times (idempotent) — only updates rows where storeId IS NULL.
 *
 * Usage: npx ts-node scripts/backfill-series-storeid.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting backfill of storeId on EntryDetailSeries...');

  // Find all series without storeId that have a valid Entry.storeId
  const seriesWithoutStore = await prisma.entryDetailSeries.findMany({
    where: { storeId: null },
    select: {
      id: true,
      serial: true,
      entryDetail: {
        select: {
          entry: {
            select: { storeId: true },
          },
        },
      },
    },
  });

  console.log(`Found ${seriesWithoutStore.length} series without storeId`);

  if (seriesWithoutStore.length === 0) {
    console.log('Nothing to backfill. All series already have storeId.');
    return;
  }

  // Group by storeId for batch updates
  const byStore = new Map<number, number[]>();
  let skipped = 0;

  for (const s of seriesWithoutStore) {
    const storeId = s.entryDetail?.entry?.storeId;
    if (!storeId) {
      skipped++;
      continue;
    }
    const ids = byStore.get(storeId) || [];
    ids.push(s.id);
    byStore.set(storeId, ids);
  }

  console.log(
    `Grouped into ${byStore.size} stores. Skipped ${skipped} (no Entry.storeId).`,
  );

  // Batch update per store
  let updated = 0;
  for (const [storeId, ids] of byStore) {
    const result = await prisma.entryDetailSeries.updateMany({
      where: { id: { in: ids } },
      data: { storeId },
    });
    updated += result.count;
    console.log(`  Store ${storeId}: updated ${result.count} series`);
  }

  console.log(`\nBackfill complete. Updated: ${updated}, Skipped: ${skipped}`);

  // Verify
  const remaining = await prisma.entryDetailSeries.count({
    where: { storeId: null },
  });
  console.log(`Remaining series without storeId: ${remaining}`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
