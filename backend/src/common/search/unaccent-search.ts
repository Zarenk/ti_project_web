import { Prisma } from '@prisma/client';

/**
 * Builds a raw SQL condition for accent-insensitive search across multiple columns.
 * Requires the `unaccent` PostgreSQL extension.
 *
 * Usage:
 *   const where = unaccentWhere(['name', 'email'], searchTerm, '"Provider"');
 *   return prisma.$queryRaw`SELECT * FROM "Provider" WHERE "organizationId" = ${orgId} AND ${where}`;
 *
 * Or use the simpler buildUnaccentOr() to get a Prisma.Sql fragment for an OR condition.
 */

/**
 * Returns a Prisma.Sql fragment: (unaccent(lower("col1")) LIKE unaccent(lower('%term%')) OR ...)
 */
export function buildUnaccentOr(
  columns: string[],
  searchTerm: string,
): Prisma.Sql {
  const pattern = `%${searchTerm}%`;
  const conditions = columns.map(
    (col) =>
      Prisma.sql`unaccent(lower(${Prisma.raw(`"${col}"`)})) LIKE unaccent(lower(${pattern}))`,
  );

  // Join conditions with OR
  if (conditions.length === 0) {
    return Prisma.sql`TRUE`;
  }

  let result = conditions[0];
  for (let i = 1; i < conditions.length; i++) {
    result = Prisma.sql`${result} OR ${conditions[i]}`;
  }

  return Prisma.sql`(${result})`;
}

/**
 * Strip diacritics for in-memory comparison (mirrors frontend normalizeSearch).
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
