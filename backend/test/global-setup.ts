import { applyMultiTenantFixtures } from '../prisma/seed/multi-tenant-fixtures.seed';

type PrismaConnectionError = {
  errorCode?: string;
  code?: string;
  message?: string;
};

type FixtureTotals = Record<string, number>;

const TRUTHY_SKIP_FLAG_VALUES = new Set([
  '1',
  'true',
  'yes',
  'on',
  'y',
  't',
]);

function normalizeSkipMultiTenantSeed(flag?: string | null): string | null {
  if (flag == null) {
    return null;
  }

  const normalized = flag.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return TRUTHY_SKIP_FLAG_VALUES.has(normalized) ? normalized : null;
}

export function shouldSkipMultiTenantSeed(flag?: string | null): boolean {
  return normalizeSkipMultiTenantSeed(flag) !== null;
}

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
      normalizedMessage.includes('timed out') ||
      normalizedMessage.includes('timeout') ||
      normalizedMessage.includes('failed to connect')
    );
  }

  return false;
}

export function formatFixtureTotals(totals?: FixtureTotals | null): string | null {
  if (!totals) {
    return null;
  }

  const formattedEntries = Object.entries(totals)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value > 0)
    .map(([entity, value]) => `${entity}: ${value}`);

  if (formattedEntries.length === 0) {
    return null;
  }

  return formattedEntries.join(', ');
}

export default async function globalSetup(): Promise<void> {
  const normalizedSkipFlag = normalizeSkipMultiTenantSeed(
    process.env.SKIP_MULTI_TENANT_SEED,
  );

  if (normalizedSkipFlag) {
    console.log(
      `[multi-tenant-seed] SKIP_MULTI_TENANT_SEED=${normalizedSkipFlag} detected, skipping fixture application.`,
    );
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn(
      '[multi-tenant-seed] DATABASE_URL not set, skipping multi-tenant fixtures to avoid Prisma connection errors.',
    );
    return;
  }

  const summaryPath = process.env.MULTI_TENANT_FIXTURES_SUMMARY_PATH?.trim();

  try {
    const summary = await applyMultiTenantFixtures({
      logger: (message) => console.log(`[multi-tenant-seed] ${message}`),
      ...(summaryPath ? { summaryPath } : {}),
    });
    console.log(
      `[multi-tenant-seed] Processed organizations: ${summary.organizations
        .map((organization) => organization.code)
        .join(', ')}`,
    );

    const formattedTotals = formatFixtureTotals(summary.totals);
    if (formattedTotals) {
      console.log(`[multi-tenant-seed] Fixture totals => ${formattedTotals}.`);
    }

    if (summary.summaryFilePath) {
      console.log(
        `[multi-tenant-seed] Summary file available at ${summary.summaryFilePath}.`,
      );
    }

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