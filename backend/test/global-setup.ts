import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { applyMultiTenantFixtures } from '../prisma/seed/multi-tenant-fixtures.seed';
import { config } from 'dotenv';

// Load environment variables from .env file before any tests run
config({ path: join(__dirname, '..', '.env') });

// 🔒 SAFETY: Prevent tests from running against production database
function isProductionDatabase(url: string): boolean {
  const prodHosts = [
    'railway.app',
    'neon.tech',
    'render.com',
    'heroku.com',
    'prod.db',
    'production.',
    'aws.com',
    'azure.com',
    'googleapis.com',
  ];
  return prodHosts.some((host) => url.toLowerCase().includes(host));
}

const DATABASE_URL = process.env.DATABASE_URL || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production' && DATABASE_URL) {
  console.warn(
    '⚠️  [TEST-SAFETY] NODE_ENV is "production". Verify DATABASE_URL!',
  );
  console.warn(`    DATABASE_URL: ${DATABASE_URL.substring(0, 50)}...`);
}

if (DATABASE_URL && isProductionDatabase(DATABASE_URL)) {
  throw new Error(
    '🚫 SAFETY ERROR: Production database detected in test environment!\n' +
      `   DATABASE_URL: ${DATABASE_URL.substring(0, 50)}...\n` +
      '   Please use a test/staging database for running tests.\n' +
      '   If this is intentional, update the production host whitelist in global-setup.ts',
  );
}

type PrismaConnectionError = {
  errorCode?: string;
  code?: string;
  message?: string;
};

type FixtureTotals = Record<string, number>;
type FixtureMetrics = {
  generatedAt: string;
  organizationsProcessed: number;
  entitiesTotal: number;
  entitiesCovered: number;
  coverageRatio: number;
  totals: FixtureTotals | undefined;
};

const TRUTHY_SKIP_FLAG_VALUES = new Set(['1', 'true', 'yes', 'on', 'y', 't']);

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

function isTruthyFlag(flag?: string | null): boolean {
  return normalizeSkipMultiTenantSeed(flag) !== null;
}

async function persistFixtureMetrics(
  metricsPath: string,
  metrics: FixtureMetrics,
): Promise<void> {
  try {
    await mkdir(dirname(metricsPath), { recursive: true });
    await writeFile(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
    console.log(`[multi-tenant-seed] Metrics written to ${metricsPath}.`);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.warn(
      `[multi-tenant-seed] Failed to write metrics file at ${metricsPath}: ${details}`,
    );
  }
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

export function formatFixtureTotals(
  totals?: FixtureTotals | null,
): string | null {
  if (!totals) {
    return null;
  }

  const formattedEntries = Object.entries(totals)
    .filter(
      ([, value]) =>
        typeof value === 'number' && Number.isFinite(value) && value > 0,
    )
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
  const metricsPath = process.env.MULTI_TENANT_FIXTURES_METRICS_PATH?.trim();
  const emitMetricsStdout = isTruthyFlag(
    process.env.MULTI_TENANT_FIXTURES_METRICS_STDOUT,
  );

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

    const metrics: FixtureMetrics = {
      generatedAt: new Date().toISOString(),
      organizationsProcessed: summary.organizations.length,
      entitiesTotal: summary.totals ? Object.keys(summary.totals).length : 0,
      entitiesCovered: summary.totals
        ? Object.values(summary.totals).filter(
            (value) =>
              typeof value === 'number' && Number.isFinite(value) && value > 0,
          ).length
        : 0,
      coverageRatio:
        summary.totals && Object.keys(summary.totals).length > 0
          ? Number(
              (
                Object.values(summary.totals).filter(
                  (value) =>
                    typeof value === 'number' &&
                    Number.isFinite(value) &&
                    value > 0,
                ).length / Object.keys(summary.totals).length
              ).toFixed(4),
            )
          : 0,
      totals: summary.totals,
    };

    if (metricsPath) {
      await persistFixtureMetrics(metricsPath, metrics);
    }

    if (emitMetricsStdout) {
      console.log('[multi-tenant-seed] Metrics JSON:', JSON.stringify(metrics));
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
