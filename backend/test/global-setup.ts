import { applyMultiTenantFixtures } from '../prisma/seed/multi-tenant-fixtures.seed';

type PrismaConnectionError = {
  errorCode?: string;
  code?: string;
  message?: string;
};

export function isRecoverablePrismaConnectionError(
  error: unknown,
): error is PrismaConnectionError {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const potentialError = error as PrismaConnectionError & Error;
  const errorCode = potentialError.errorCode ?? potentialError.code ?? '';
  if (errorCode === 'P1001') {
    return true;
  }

  if (potentialError instanceof Error) {
    const normalizedMessage = potentialError.message.toLowerCase();
    return (
      normalizedMessage.includes("can't reach database server") ||
      normalizedMessage.includes('econnrefused') ||
      normalizedMessage.includes('timeout') ||
      normalizedMessage.includes('failed to connect')
    );
  }

  return false;
}

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

  try {
    const summary = await applyMultiTenantFixtures({
      logger: (message) => console.log(`[multi-tenant-seed] ${message}`),
    });
    console.log(
      `[multi-tenant-seed] Processed organizations: ${summary.organizations
        .map((organization) => organization.code)
        .join(', ')}`,
    );
  } catch (error) {
    if (isRecoverablePrismaConnectionError(error)) {
      const details = error instanceof Error ? error.message : String(error);
      console.warn(
        `[multi-tenant-seed] Failed to apply fixtures due to a database connectivity issue: ${details}`,
      );
      console.warn(
        '[multi-tenant-seed] Continuing without fixtures. Provide a reachable DATABASE_URL or set SKIP_MULTI_TENANT_SEED=true to silence this message.',
      );
      return;
    }

    throw error;
  }
}