import { applyMultiTenantFixtures } from '../prisma/seed/multi-tenant-fixtures.seed';

export default async function globalSetup(): Promise<void> {
  if (process.env.SKIP_MULTI_TENANT_SEED === 'true') {
    console.log(
      '[multi-tenant-seed] SKIP_MULTI_TENANT_SEED=true detected, skipping fixture application.',
    );
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn(
      '[multi-tenant-seed] DATABASE_URL not set, skipping multi-tenant fixtures to avoid Prisma connection errors.',
    );
    return;
  }

  await applyMultiTenantFixtures({
    logger: (message) => console.log(`[multi-tenant-seed] ${message}`),
  });
}