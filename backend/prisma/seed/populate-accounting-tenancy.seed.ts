import { PrismaClient, Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

export type PopulateAccountingTenancyOptions = {
  prisma?: PrismaClient;
  logger?: Logger;
  dryRun?: boolean;
  chunkSize?: number;
  summaryStdout?: boolean;
  summaryPath?: string;
};

type EntrySeedRow = {
  id: number;
  organizationId: number | null;
  companyId: number | null;
  source: string | null;
  sourceId: number | null;
  providerId: number | null;
};

type InventoryEntryRow = {
  id: number;
  organizationId: number | null;
  store?: {
    id: number;
    organizationId: number | null;
    companyId: number | null;
  } | null;
};

type ProviderRow = { id: number; organizationId: number | null };

type AccountingUpdatePlan = {
  id: number;
  data: Prisma.AccEntryUpdateInput;
  reasons: string[];
};

type PopulateAccountingSummary = {
  scanned: number;
  planned: number;
  updated: number;
  dryRun: boolean;
  chunkSize: number;
  reasons: Record<string, number>;
};

const DEFAULT_CHUNK_SIZE = 50;

function incrementReason(
  reasons: Record<string, number>,
  reason: string | undefined,
) {
  if (!reason) {
    return;
  }
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const normalized = Math.max(1, size);
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += normalized) {
    result.push(items.slice(i, i + normalized));
  }
  return result;
}

async function writeSummary(
  summaryPath: string | undefined,
  summary: PopulateAccountingSummary,
  logger: Logger,
) {
  if (!summaryPath) {
    return;
  }
  try {
    await mkdir(dirname(summaryPath), { recursive: true });
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    logger.info(
      `[populate-accounting-tenancy] Summary written to ${summaryPath}`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    logger.warn(
      `[populate-accounting-tenancy] Failed to write summary at ${summaryPath}: ${message}`,
    );
  }
}

async function fetchInventoryEntries(
  prisma: PrismaClient,
  ids: number[],
): Promise<Map<number, InventoryEntryRow>> {
  if (ids.length === 0) {
    return new Map();
  }
  const uniqueIds = Array.from(new Set(ids));
  const rows = await prisma.entry.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      organizationId: true,
      store: {
        select: {
          id: true,
          organizationId: true,
          companyId: true,
        },
      },
    },
  });
  return new Map(rows.map((row) => [row.id, row as InventoryEntryRow]));
}

async function fetchProviders(
  prisma: PrismaClient,
  ids: number[],
): Promise<Map<number, ProviderRow>> {
  if (ids.length === 0) {
    return new Map();
  }
  const uniqueIds = Array.from(new Set(ids));
  const rows = await prisma.provider.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, organizationId: true },
  });
  return new Map(rows.map((row) => [row.id, row as ProviderRow]));
}

function resolveFromInventory(
  entry: EntrySeedRow,
  inventoryRow: InventoryEntryRow | undefined,
  reasons: string[],
): { organizationId: number | null; companyId: number | null } {
  if (!inventoryRow) {
    return { organizationId: entry.organizationId, companyId: entry.companyId };
  }

  let organizationId = entry.organizationId;
  let companyId = entry.companyId;

  if (organizationId == null) {
    organizationId =
      inventoryRow.organizationId ?? inventoryRow.store?.organizationId ?? null;
    if (organizationId != null) {
      reasons.push('inventory_entry');
    }
  }

  if (companyId == null) {
    companyId = inventoryRow.store?.companyId ?? null;
    if (companyId != null) {
      reasons.push('inventory_store');
    }
  }

  return { organizationId, companyId };
}

function resolveFromProvider(
  entry: EntrySeedRow,
  providerRow: ProviderRow | undefined,
  reasons: string[],
): { organizationId: number | null; companyId: number | null } {
  let organizationId = entry.organizationId;
  if (organizationId == null && providerRow?.organizationId != null) {
    organizationId = providerRow.organizationId;
    reasons.push('provider');
  }
  return { organizationId, companyId: entry.companyId };
}

function buildUpdatePlan(
  entry: EntrySeedRow,
  organizationId: number | null,
  companyId: number | null,
  reasons: string[],
): AccountingUpdatePlan | null {
  const data: Prisma.AccEntryUpdateInput = {};

  if (organizationId !== entry.organizationId) {
    data.organization =
      organizationId == null
        ? { disconnect: true }
        : { connect: { id: organizationId } };
  }

  if (companyId !== entry.companyId) {
    data.company =
      companyId == null ? { disconnect: true } : { connect: { id: companyId } };
  }

  if (data.organization === undefined && data.company === undefined) {
    return null;
  }

  return { id: entry.id, data, reasons };
}

export async function populateAccountingTenancy(
  options: PopulateAccountingTenancyOptions = {},
): Promise<PopulateAccountingSummary> {
  const prisma = options.prisma ?? new PrismaClient();
  const logger = options.logger ?? console;
  const dryRun = options.dryRun ?? false;
  const chunkSize = Math.max(1, options.chunkSize ?? DEFAULT_CHUNK_SIZE);
  const summary: PopulateAccountingSummary = {
    scanned: 0,
    planned: 0,
    updated: 0,
    dryRun,
    chunkSize,
    reasons: {},
  };

  const shouldDisconnect = options.prisma == null;

  try {
    const entries = await prisma.accEntry.findMany({
      where: {
        OR: [{ organizationId: null }, { companyId: null }],
      },
      select: {
        id: true,
        organizationId: true,
        companyId: true,
        source: true,
        sourceId: true,
        providerId: true,
      },
    });

    summary.scanned = entries.length;

    if (entries.length === 0) {
      logger.info(
        '[populate-accounting-tenancy] No accounting entries require updates.',
      );
      await writeSummary(options.summaryPath, summary, logger);
      if (options.summaryStdout) {
        logger.info(JSON.stringify(summary, null, 2));
      }
      return summary;
    }

    const inventorySourceIds = entries
      .filter(
        (entry) =>
          entry.source === 'inventory_entry' && entry.sourceId != null,
      )
      .map((entry) => entry.sourceId as number);
    const providerIds = entries
      .filter((entry) => entry.providerId != null)
      .map((entry) => entry.providerId as number);

    const inventoryMap = await fetchInventoryEntries(prisma, inventorySourceIds);
    const providerMap = await fetchProviders(prisma, providerIds);

    const plans: AccountingUpdatePlan[] = [];

    for (const entry of entries) {
      const reasons: string[] = [];
      let organizationId = entry.organizationId;
      let companyId = entry.companyId;

      if (entry.source === 'inventory_entry' && entry.sourceId != null) {
        const resolved = resolveFromInventory(
          entry,
          inventoryMap.get(entry.sourceId),
          reasons,
        );
        organizationId = resolved.organizationId;
        companyId = resolved.companyId;
      }

      if (organizationId == null && entry.providerId != null) {
        const resolved = resolveFromProvider(
          { ...entry, organizationId, companyId },
          providerMap.get(entry.providerId),
          reasons,
        );
        organizationId = resolved.organizationId;
      }

      const plan = buildUpdatePlan(entry, organizationId, companyId, reasons);
      if (plan) {
        plans.push(plan);
        summary.planned += 1;
        if (plan.reasons.length === 0) {
          incrementReason(summary.reasons, 'fallback');
        } else {
          for (const reason of plan.reasons) {
            incrementReason(summary.reasons, reason);
          }
        }
      }
    }

    if (plans.length === 0) {
      logger.info(
        '[populate-accounting-tenancy] All accounting entries already include organization/company identifiers.',
      );
      await writeSummary(options.summaryPath, summary, logger);
      if (options.summaryStdout) {
        logger.info(JSON.stringify(summary, null, 2));
      }
      return summary;
    }

    if (dryRun) {
      logger.info(
        `[populate-accounting-tenancy] Planned updates for ${plans.length} entries (dry-run).`,
      );
      await writeSummary(options.summaryPath, summary, logger);
      if (options.summaryStdout) {
        logger.info(JSON.stringify(summary, null, 2));
      }
      return summary;
    }

    const chunks = chunkArray(plans, chunkSize);
    for (const chunk of chunks) {
      await prisma.$transaction(
        chunk.map((plan) =>
          prisma.accEntry.update({
            where: { id: plan.id },
            data: plan.data,
          }),
        ),
      );
      summary.updated += chunk.length;
    }

    logger.info(
      `[populate-accounting-tenancy] Updated ${summary.updated} accounting entries (planned ${summary.planned}).`,
    );
    await writeSummary(options.summaryPath, summary, logger);
    if (options.summaryStdout) {
      logger.info(JSON.stringify(summary, null, 2));
    }
    return summary;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

function parseBooleanFlag(flag: string, raw?: string) {
  if (raw === undefined || raw.startsWith('--')) {
    return { consumed: 0, value: true };
  }
  const normalized = raw.toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return { consumed: 1, value: true };
  }
  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return { consumed: 1, value: false };
  }
  throw new Error(`[populate-accounting-tenancy] Invalid boolean for ${flag}`);
}

function parseNumberFlag(flag: string, value: string | undefined): number {
  if (!value) {
    throw new Error(`[populate-accounting-tenancy] Missing value for ${flag}`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `[populate-accounting-tenancy] Invalid numeric value for ${flag}: ${value}`,
    );
  }
  return parsed;
}

function parseStringFlag(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[populate-accounting-tenancy] Missing value for ${flag}`);
  }
  return value;
}

export function parsePopulateAccountingTenancyArgs(argv: string[]) {
  const options: PopulateAccountingTenancyOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        continue;
      case '--summary-stdout':
        options.summaryStdout = true;
        continue;
    }

    if (arg.startsWith('--chunk-size=')) {
      const [, raw] = arg.split('=');
      options.chunkSize = parseNumberFlag('--chunk-size', raw);
      continue;
    }
    if (arg === '--chunk-size') {
      const value = argv[index + 1];
      options.chunkSize = parseNumberFlag('--chunk-size', value);
      index += 1;
      continue;
    }

    if (arg.startsWith('--summary-path=')) {
      const [, raw] = arg.split('=');
      options.summaryPath = parseStringFlag('--summary-path', raw);
      continue;
    }
    if (arg === '--summary-path') {
      const value = argv[index + 1];
      options.summaryPath = parseStringFlag('--summary-path', value);
      index += 1;
      continue;
    }

    if (arg.startsWith('--summary-stdout=')) {
      const [, raw] = arg.split('=');
      const { value } = parseBooleanFlag('--summary-stdout', raw);
      options.summaryStdout = value;
      continue;
    }

    if (arg.startsWith('--dry-run=')) {
      const [, raw] = arg.split('=');
      const { value } = parseBooleanFlag('--dry-run', raw);
      options.dryRun = value;
      continue;
    }

    if (arg.startsWith('--logger=')) {
      throw new Error(
        '[populate-accounting-tenancy] --logger flag is not supported; provide a logger instance programmatically.',
      );
    }

    if (arg.trim().length > 0) {
      throw new Error(
        `[populate-accounting-tenancy] Unknown argument received: ${arg}`,
      );
    }
  }

  return options;
}

if (require.main === module) {
  try {
    const options = parsePopulateAccountingTenancyArgs(process.argv.slice(2));
    populateAccountingTenancy(options)
      .then((summary) => {
        console.info(
          `[populate-accounting-tenancy] Completed. scanned=${summary.scanned}, planned=${summary.planned}, updated=${summary.updated}, dryRun=${summary.dryRun ? 'yes' : 'no'}.`,
        );
      })
      .catch((error) => {
        console.error(
          '[populate-accounting-tenancy] Failed to populate accounting entries.',
          error,
        );
        process.exit(1);
      });
  } catch (error) {
    console.error(
      '[populate-accounting-tenancy] Failed to parse CLI arguments.',
      error,
    );
    process.exit(1);
  }
}
