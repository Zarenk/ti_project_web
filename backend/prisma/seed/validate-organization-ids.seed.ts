import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  POPULATE_ENTITY_KEYS,
  type PopulateEntityKey,
  isPopulateEntityKey,
} from './populate-organization-ids.seed';

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

export type ValidationOptions = {
  prisma?: PrismaClient;
  logger?: Logger;
  onlyEntities?: PopulateEntityKey[];
  skipEntities?: PopulateEntityKey[];
  summaryPath?: string;
  summaryStdout?: boolean;
  failOnMissing?: boolean;
};

type EntityValidationSummary = {
  total: number;
  missing: number;
  present: number;
  mismatched: number;
  mismatchSample: string[];
};

type ValidationSummary = {
  processed: Partial<Record<PopulateEntityKey, EntityValidationSummary>>;
  generatedAt: string;
  missingEntities: PopulateEntityKey[];
  mismatchedEntities: PopulateEntityKey[];
  hasMissing: boolean;
  hasMismatched: boolean;
  summaryFilePath?: string;
};

type ValidationContext = {
  prisma: PrismaClient & Record<string, any>;
  logger: Logger;
};

type EntityCounter = (context: ValidationContext) => Promise<EntityValidationSummary>;

const VALIDATION_ENTITY_COUNTERS: ReadonlyArray<{
  key: PopulateEntityKey;
  counter: EntityCounter;
}> = [
  { key: 'store', counter: countStores },
  { key: 'cash-register', counter: countCashRegisters },
  { key: 'user', counter: countUsers },
  { key: 'client', counter: countClients },
  { key: 'inventory', counter: countInventories },
  { key: 'inventory-history', counter: countInventoryHistories },
  { key: 'entry', counter: countEntries },
  { key: 'provider', counter: countProviders },
  { key: 'sales', counter: countSales },
  { key: 'transfer', counter: countTransfers },
  { key: 'orders', counter: countOrders },
  { key: 'cash-transaction', counter: countCashTransactions },
  { key: 'cash-closure', counter: countCashClosures },
];

function createSummary(): ValidationSummary {
  return {
    processed: {},
    generatedAt: new Date().toISOString(),
    missingEntities: [],
    mismatchedEntities: [],
    hasMissing: false,
    hasMismatched: false,
  };
}

async function persistSummaryToFile(
  summaryPath: string,
  summary: ValidationSummary,
  logger: Logger,
): Promise<boolean> {
  try {
    await mkdir(dirname(summaryPath), { recursive: true });
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    logger.info(`[validate-org] Summary written to ${summaryPath}.`);
    return true;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    logger.warn(
      `[validate-org] Failed to write summary file at ${summaryPath}: ${details}`,
    );
    return false;
  }
}

type MismatchSummary = { count: number; sample: string[] };

async function summarizeEntityWithOrganization<
  T extends { count: (args?: any) => Promise<number> }
>(
  model: T,
  detectMismatches?: () => Promise<MismatchSummary>,
): Promise<EntityValidationSummary> {
  const [total, missing] = await Promise.all([
    model.count(),
    model.count({ where: { organizationId: null } } as any),
  ]);

  const present = Math.max(total - missing, 0);
  let mismatched = 0;
  let mismatchSample: string[] = [];

  if (detectMismatches) {
    const result = await detectMismatches();
    mismatched = result.count;
    mismatchSample = result.sample;
  }

  return { total, missing, present, mismatched, mismatchSample };
}

async function countStores(context: ValidationContext) {
  return summarizeEntityWithOrganization(context.prisma.store);
}

async function countCashRegisters(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.cashRegister,
    () => detectCashRegisterMismatches(context),
  );
}

async function countUsers(context: ValidationContext) {
  return summarizeEntityWithOrganization(context.prisma.user);
}

async function countClients(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.client,
    () => detectClientMismatches(context),
  );
}

async function countInventories(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.inventory,
    () => detectInventoryMismatches(context),
  );
}

async function countInventoryHistories(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.inventoryHistory,
    () => detectInventoryHistoryMismatches(context),
  );
}

async function countEntries(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.entry,
    () => detectEntryMismatches(context),
  );
}

async function countProviders(context: ValidationContext) {
  return summarizeEntityWithOrganization(context.prisma.provider);
}

async function countSales(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.sales,
    () => detectSalesMismatches(context),
  );
}

async function countTransfers(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.transfer,
    () => detectTransferMismatches(context),
  );
}

async function countOrders(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.orders,
    () => detectOrderMismatches(context),
  );
}

async function countCashTransactions(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.cashTransaction,
    () => detectCashTransactionMismatches(context),
  );
}

async function countCashClosures(context: ValidationContext) {
  return summarizeEntityWithOrganization(
    context.prisma.cashClosure,
    () => detectCashClosureMismatches(context),
  );
}

type ReferenceValue = { label: string; value: number | null };

function summarizeMismatches<T>(
  records: T[],
  getId: (record: T) => string | number,
  getActual: (record: T) => number | null,
  getReferences: (record: T) => ReferenceValue[],
): MismatchSummary {
  const mismatched: string[] = [];

  for (const record of records) {
    const actual = getActual(record);
    if (actual === null) {
      continue;
    }

    const references = getReferences(record);
    const nonNullReferences = references.filter((reference) => reference.value !== null);
    if (!nonNullReferences.length) {
      continue;
    }

    const uniqueReferenceValues = new Set(nonNullReferences.map((reference) => reference.value));
    const mismatchWithActual = nonNullReferences.some((reference) => reference.value !== actual);
    const mismatchBetweenReferences = uniqueReferenceValues.size > 1;

    if (mismatchWithActual || mismatchBetweenReferences) {
      const referenceDescription = references
        .map((reference) => `${reference.label}:${reference.value ?? 'null'}`)
        .join(', ');
      mismatched.push(`${getId(record)} (org=${actual ?? 'null'} | refs=${referenceDescription || 'none'})`);
    }
  }

  return { count: mismatched.length, sample: mismatched.slice(0, 5) };
}

async function detectCashRegisterMismatches(context: ValidationContext): Promise<MismatchSummary> {
  const registers = (await context.prisma.cashRegister.findMany({
    select: {
      id: true,
      organizationId: true,
      store: { select: { organizationId: true } as any },
    },
  } as any)) as unknown as Array<{ id: number; organizationId: number | null; store: { organizationId: number | null } | null }>;

  return summarizeMismatches(
    registers,
    (register) => register.id,
    (register) => register.organizationId ?? null,
    (register) => [
      { label: 'store', value: register.store?.organizationId ?? null },
    ],
  );
}

async function detectClientMismatches(context: ValidationContext): Promise<MismatchSummary> {
  const clients = (await context.prisma.client.findMany({
    select: {
      id: true,
      organizationId: true,
      user: { select: { organizationId: true } as any },
    },
  } as any)) as unknown as Array<{ id: number; organizationId: number | null; user: { organizationId: number | null } | null }>;

  return summarizeMismatches(
    clients,
    (client) => client.id,
    (client) => client.organizationId ?? null,
    (client) => [{ label: 'user', value: client.user?.organizationId ?? null }],
  );
}

async function detectInventoryMismatches(context: ValidationContext): Promise<MismatchSummary> {
  const inventories = (await context.prisma.inventory.findMany({
    select: {
      id: true,
      organizationId: true,
      storeId: true,
    },
  } as any)) as unknown as Array<{ id: number; organizationId: number | null; storeId: number }>;

  const storeIds = Array.from(new Set(inventories.map((inventory) => inventory.storeId)));
  const stores = storeIds.length
    ? ((await context.prisma.store.findMany({
        where: { id: { in: storeIds } },
        select: { id: true, organizationId: true },
      } as any)) as unknown as Array<{ id: number; organizationId: number | null }>)
    : [];

  const storeOrganizationMap = new Map<number, number | null>();
  for (const store of stores) {
    storeOrganizationMap.set(store.id, store.organizationId ?? null);
  }

  return summarizeMismatches(
    inventories,
    (inventory) => inventory.id,
    (inventory) => inventory.organizationId ?? null,
    (inventory) => [
      {
        label: 'store',
        value: storeOrganizationMap.get(inventory.storeId) ?? null,
      },
    ],
  );
}

async function detectInventoryHistoryMismatches(
  context: ValidationContext,
): Promise<MismatchSummary> {
  const histories = (await context.prisma.inventoryHistory.findMany({
    select: {
      id: true,
      organizationId: true,
      inventory: { select: { organizationId: true } as any },
    },
  } as any)) as unknown as Array<{
    id: number;
    organizationId: number | null;
    inventory: { organizationId: number | null } | null;
  }>;

  return summarizeMismatches(
    histories,
    (history) => history.id,
    (history) => history.organizationId ?? null,
    (history) => [{ label: 'inventory', value: history.inventory?.organizationId ?? null }],
  );
}

async function detectEntryMismatches(context: ValidationContext): Promise<MismatchSummary> {
  const entries = (await context.prisma.entry.findMany({
    select: {
      id: true,
      organizationId: true,
      store: { select: { organizationId: true } as any },
      user: { select: { organizationId: true } as any },
      provider: { select: { organizationId: true } as any },
    },
  } as any)) as unknown as Array<{
    id: number;
    organizationId: number | null;
    store: { organizationId: number | null } | null;
    user: { organizationId: number | null } | null;
    provider: { organizationId: number | null } | null;
  }>;

  return summarizeMismatches(
    entries,
    (entry) => entry.id,
    (entry) => entry.organizationId ?? null,
    (entry) => [
      { label: 'store', value: entry.store?.organizationId ?? null },
      { label: 'user', value: entry.user?.organizationId ?? null },
      { label: 'provider', value: entry.provider?.organizationId ?? null },
    ],
  );
}

async function detectSalesMismatches(context: ValidationContext): Promise<MismatchSummary> {
  const sales = (await context.prisma.sales.findMany({
    select: {
      id: true,
      organizationId: true,
      store: { select: { organizationId: true } as any },
      user: { select: { organizationId: true } as any },
      client: { select: { organizationId: true } as any },
    },
  } as any)) as unknown as Array<{
    id: number;
    organizationId: number | null;
    store: { organizationId: number | null } | null;
    user: { organizationId: number | null } | null;
    client: { organizationId: number | null } | null;
  }>;

  return summarizeMismatches(
    sales,
    (sale) => sale.id,
    (sale) => sale.organizationId ?? null,
    (sale) => [
      { label: 'store', value: sale.store?.organizationId ?? null },
      { label: 'user', value: sale.user?.organizationId ?? null },
      { label: 'client', value: sale.client?.organizationId ?? null },
    ],
  );
}

async function detectTransferMismatches(context: ValidationContext): Promise<MismatchSummary> {
  const transfers = (await context.prisma.transfer.findMany({
    select: {
      id: true,
      organizationId: true,
      sourceStore: { select: { organizationId: true } as any },
      destinationStore: { select: { organizationId: true } as any },
    },
  } as any)) as unknown as Array<{
    id: number;
    organizationId: number | null;
    sourceStore: { organizationId: number | null } | null;
    destinationStore: { organizationId: number | null } | null;
  }>;

  return summarizeMismatches(
    transfers,
    (transfer) => transfer.id,
    (transfer) => transfer.organizationId ?? null,
    (transfer) => [
      { label: 'sourceStore', value: transfer.sourceStore?.organizationId ?? null },
      { label: 'destinationStore', value: transfer.destinationStore?.organizationId ?? null },
    ],
  );
}

async function detectOrderMismatches(context: ValidationContext): Promise<MismatchSummary> {
  const orders = (await context.prisma.orders.findMany({
    select: {
      id: true,
      organizationId: true,
      sale: { select: { organizationId: true } as any },
    },
  } as any)) as unknown as Array<{
    id: number;
    organizationId: number | null;
    sale: { organizationId: number | null } | null;
  }>;

  return summarizeMismatches(
    orders,
    (order) => order.id,
    (order) => order.organizationId ?? null,
    (order) => [{ label: 'sale', value: order.sale?.organizationId ?? null }],
  );
}

async function detectCashTransactionMismatches(
  context: ValidationContext,
): Promise<MismatchSummary> {
  const transactions = (await context.prisma.cashTransaction.findMany({
    select: {
      id: true,
      organizationId: true,
      cashRegister: { select: { organizationId: true } as any },
      user: { select: { organizationId: true } as any },
    },
  } as any)) as unknown as Array<{
    id: number;
    organizationId: number | null;
    cashRegister: { organizationId: number | null } | null;
    user: { organizationId: number | null } | null;
  }>;

  return summarizeMismatches(
    transactions,
    (transaction) => transaction.id,
    (transaction) => transaction.organizationId ?? null,
    (transaction) => [
      { label: 'cashRegister', value: transaction.cashRegister?.organizationId ?? null },
      { label: 'user', value: transaction.user?.organizationId ?? null },
    ],
  );
}

async function detectCashClosureMismatches(context: ValidationContext): Promise<MismatchSummary> {
  const closures = (await context.prisma.cashClosure.findMany({
    select: {
      id: true,
      organizationId: true,
      cashRegister: { select: { organizationId: true } as any },
      user: { select: { organizationId: true } as any },
    },
  } as any)) as unknown as Array<{
    id: number;
    organizationId: number | null;
    cashRegister: { organizationId: number | null } | null;
    user: { organizationId: number | null } | null;
  }>;

  return summarizeMismatches(
    closures,
    (closure) => closure.id,
    (closure) => closure.organizationId ?? null,
    (closure) => [
      { label: 'cashRegister', value: closure.cashRegister?.organizationId ?? null },
      { label: 'user', value: closure.user?.organizationId ?? null },
    ],
  );
}

function resolveEntities(
  onlyEntities: PopulateEntityKey[] | undefined,
  skipEntities: PopulateEntityKey[] | undefined,
): PopulateEntityKey[] {
  const effectiveOnly =
    onlyEntities && onlyEntities.length > 0
      ? new Set(onlyEntities)
      : new Set<PopulateEntityKey>(POPULATE_ENTITY_KEYS);

  const skipSet = new Set(skipEntities ?? []);

  return POPULATE_ENTITY_KEYS.filter(
    (entity) => effectiveOnly.has(entity) && !skipSet.has(entity),
  );
}

export async function validateOrganizationIds(
  options: ValidationOptions = {},
): Promise<ValidationSummary> {
  const prisma = options.prisma ?? new PrismaClient();
  const shouldDisconnect = !options.prisma;
  const logger = options.logger ?? console;
  const context: ValidationContext = { prisma: prisma as ValidationContext['prisma'], logger };
  const selectedEntities = resolveEntities(options.onlyEntities, options.skipEntities);

  try {
    const summary = createSummary();

    if (!selectedEntities.length) {
      logger.warn('[validate-org] No entities selected for validation.');
      return summary;
    }

    for (const { key, counter } of VALIDATION_ENTITY_COUNTERS) {
      if (!selectedEntities.includes(key)) {
        continue;
      }

      const entitySummary = await counter(context);
      summary.processed[key] = entitySummary;

      const message =
        `[validate-org] ${key}: total=${entitySummary.total}, missing=${entitySummary.missing}, present=${entitySummary.present}, mismatched=${entitySummary.mismatched}.`;

      if (entitySummary.missing > 0) {
        logger.warn(message);
        summary.missingEntities.push(key);
      } else {
        logger.info(message);
      }

      if (entitySummary.mismatched > 0) {
        summary.mismatchedEntities.push(key);
        const sampleDescription =
          entitySummary.mismatchSample.length > 0
            ? ` Sample: ${entitySummary.mismatchSample.join('; ')}`
            : '';
        logger.warn(
          `[validate-org] ${key}: detected ${entitySummary.mismatched} records with inconsistent organizationId references.${sampleDescription}`,
        );
      }
    }

    summary.hasMissing = summary.missingEntities.length > 0;
    summary.hasMismatched = summary.mismatchedEntities.length > 0;

    if (summary.hasMissing) {
      logger.warn(
        `[validate-org] Missing organizationId detected in ${summary.missingEntities.join(', ')}.`,
      );
    } else {
      logger.info('[validate-org] All processed entities have organizationId populated.');
    }

    if (summary.hasMismatched) {
      logger.warn(
        `[validate-org] organizationId mismatches detected in ${summary.mismatchedEntities.join(', ')}.`,
      );
    } else {
      logger.info('[validate-org] No organizationId mismatches detected across processed entities.');
    }

    if (options.summaryPath) {
      const persisted = await persistSummaryToFile(options.summaryPath, summary, logger);
      if (persisted) {
        summary.summaryFilePath = options.summaryPath;
      }
    }

    if (options.summaryStdout) {
      logger.info('[validate-org] Summary JSON:', JSON.stringify(summary, null, 2));
    }

    if (options.failOnMissing && (summary.hasMissing || summary.hasMismatched)) {
      const issues: string[] = [];
      if (summary.hasMissing) {
        issues.push(`missing organizationId in ${summary.missingEntities.join(', ')}`);
      }
      if (summary.hasMismatched) {
        issues.push(`mismatched organizationId references in ${summary.mismatchedEntities.join(', ')}`);
      }
      const failureMessage = `[validate-org] Validation failed: ${issues.join('; ')}.`;
      logger.error(failureMessage);
      throw new Error(failureMessage);
    }

    return summary;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

type CliOptions = Pick<
  ValidationOptions,
  'onlyEntities' | 'skipEntities' | 'summaryPath' | 'summaryStdout' | 'failOnMissing'
>;

function parseEntityList(flag: string, value: string | undefined): PopulateEntityKey[] {
  if (!value) {
    throw new Error(`[validate-org] Missing value for ${flag}.`);
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (!items.length) {
    throw new Error(`[validate-org] ${flag} requires at least one entity.`);
  }

  const uniqueItems = Array.from(new Set(items));
  const entities: PopulateEntityKey[] = [];

  for (const item of uniqueItems) {
    if (!isPopulateEntityKey(item)) {
      throw new Error(`[validate-org] Unknown entity provided for ${flag}: ${item}`);
    }
    entities.push(item);
  }

  return entities;
}

function parseStringArgument(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[validate-org] Missing value for ${flag}.`);
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new Error(`[validate-org] ${flag} cannot be empty.`);
  }

  return trimmed;
}

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSY_VALUES = new Set(['0', 'false', 'no', 'off']);

function parseBooleanFlag(
  flag: string,
  nextValue: string | undefined,
): { consumed: number; value: boolean } {
  if (!nextValue || nextValue.startsWith('--')) {
    return { consumed: 0, value: true };
  }

  const normalized = nextValue.trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) {
    return { consumed: 1, value: true };
  }
  if (FALSY_VALUES.has(normalized)) {
    return { consumed: 1, value: false };
  }

  throw new Error(`[validate-org] Invalid boolean value for ${flag}: ${nextValue}`);
}

export function parseValidateOrganizationCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  const nextValue = (args: string[], index: number): [string | undefined, number] => {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      return [undefined, index];
    }
    return [value, index + 1];
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg.startsWith('--only=') || arg.startsWith('--only-entities=')) {
      const [flag, raw] = arg.split('=');
      options.onlyEntities = parseEntityList(flag, raw);
      continue;
    }

    if (arg === '--only' || arg === '--only-entities' || arg === '--onlyEntities') {
      const [value, nextIndex] = nextValue(argv, index);
      options.onlyEntities = parseEntityList(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--skip=') || arg.startsWith('--skip-entities=')) {
      const [flag, raw] = arg.split('=');
      options.skipEntities = parseEntityList(flag, raw);
      continue;
    }

    if (arg === '--skip' || arg === '--skip-entities' || arg === '--skipEntities') {
      const [value, nextIndex] = nextValue(argv, index);
      options.skipEntities = parseEntityList(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--summary-path=') || arg.startsWith('--summaryPath=')) {
      const [flag, raw] = arg.split('=');
      options.summaryPath = parseStringArgument(flag, raw);
      continue;
    }

    if (arg === '--summary-path' || arg === '--summaryPath' || arg === '--summaryFile') {
      const [value, nextIndex] = nextValue(argv, index);
      options.summaryPath = parseStringArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (
      arg.startsWith('--summary-stdout=') ||
      arg.startsWith('--summaryStdout=') ||
      arg.startsWith('--summary-json=') ||
      arg.startsWith('--summaryJson=')
    ) {
      const [flag, raw] = arg.split('=');
      const { value } = parseBooleanFlag(flag, raw);
      options.summaryStdout = value;
      continue;
    }

    if (
      arg === '--summary-stdout' ||
      arg === '--summaryStdout' ||
      arg === '--summary-json' ||
      arg === '--summaryJson'
    ) {
      const { consumed, value } = parseBooleanFlag(arg, argv[index + 1]);
      options.summaryStdout = value;
      index += consumed;
      continue;
    }

    if (arg.startsWith('--fail-on-missing=') || arg.startsWith('--failOnMissing=')) {
      const [flag, raw] = arg.split('=');
      const { value } = parseBooleanFlag(flag, raw);
      options.failOnMissing = value;
      continue;
    }

    if (arg === '--fail-on-missing' || arg === '--failOnMissing') {
      const { consumed, value } = parseBooleanFlag(arg, argv[index + 1]);
      options.failOnMissing = value;
      index += consumed;
      continue;
    }

    if (arg.trim().length > 0) {
      throw new Error(`[validate-org] Unknown argument: ${arg}`);
    }
  }

  return options;
}

if (require.main === module) {
  try {
    const cliOptions = parseValidateOrganizationCliArgs(process.argv.slice(2));
    validateOrganizationIds(cliOptions)
      .then((summary) => {
        const processedCount = Object.keys(summary.processed).length;
        const missingDescription = summary.hasMissing
          ? summary.missingEntities.join(', ')
          : 'none';
        const mismatchedDescription = summary.hasMismatched
          ? summary.mismatchedEntities.join(', ')
          : 'none';

        console.info(
          `[validate-org] Completed validation for ${processedCount} entit${
            processedCount === 1 ? 'y' : 'ies'
          }. Missing: ${missingDescription}. Mismatched: ${mismatchedDescription}.`,
        );

        if (summary.summaryFilePath) {
          console.info(
            `[validate-org] Summary file available at ${summary.summaryFilePath}.`,
          );
        }
      })
      .catch((error) => {
        console.error('[validate-org] Validation failed.', error);
        process.exit(1);
      });
  } catch (error) {
    console.error('[validate-org] Failed to parse CLI arguments.', error);
    process.exit(1);
  }
}