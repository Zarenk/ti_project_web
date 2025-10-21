import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  POPULATE_ENTITY_KEYS,
  type PopulateEntityKey,
  isPopulateEntityKey,
} from './populate-organization-ids.seed';

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

type ValidationOptions = {
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
};

type ValidationSummary = {
  processed: Partial<Record<PopulateEntityKey, EntityValidationSummary>>;
  generatedAt: string;
  missingEntities: PopulateEntityKey[];
  hasMissing: boolean;
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
    hasMissing: false,
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

async function countWithOrganization<T extends { count: (args?: any) => Promise<number> }>(
  model: T,
): Promise<EntityValidationSummary> {
  const [total, missing] = await Promise.all([
    model.count(),
    model.count({ where: { organizationId: null } } as any),
  ]);

  const present = Math.max(total - missing, 0);
  return { total, missing, present };
}

async function countStores(context: ValidationContext) {
  return countWithOrganization(context.prisma.store);
}

async function countCashRegisters(context: ValidationContext) {
  return countWithOrganization(context.prisma.cashRegister);
}

async function countUsers(context: ValidationContext) {
  return countWithOrganization(context.prisma.user);
}

async function countClients(context: ValidationContext) {
  return countWithOrganization(context.prisma.client);
}

async function countInventories(context: ValidationContext) {
  return countWithOrganization(context.prisma.inventory);
}

async function countInventoryHistories(context: ValidationContext) {
  return countWithOrganization(context.prisma.inventoryHistory);
}

async function countEntries(context: ValidationContext) {
  return countWithOrganization(context.prisma.entry);
}

async function countProviders(context: ValidationContext) {
  return countWithOrganization(context.prisma.provider);
}

async function countSales(context: ValidationContext) {
  return countWithOrganization(context.prisma.sales);
}

async function countTransfers(context: ValidationContext) {
  return countWithOrganization(context.prisma.transfer);
}

async function countOrders(context: ValidationContext) {
  return countWithOrganization(context.prisma.orders);
}

async function countCashTransactions(context: ValidationContext) {
  return countWithOrganization(context.prisma.cashTransaction);
}

async function countCashClosures(context: ValidationContext) {
  return countWithOrganization(context.prisma.cashClosure);
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
        `[validate-org] ${key}: total=${entitySummary.total}, missing=${entitySummary.missing}, present=${entitySummary.present}.`;

      if (entitySummary.missing > 0) {
        logger.warn(message);
        summary.missingEntities.push(key);
      } else {
        logger.info(message);
      }
    }

    summary.hasMissing = summary.missingEntities.length > 0;

    if (summary.hasMissing) {
      logger.warn(
        `[validate-org] Missing organizationId detected in ${summary.missingEntities.join(', ')}.`,
      );
    } else {
      logger.info('[validate-org] All processed entities have organizationId populated.');
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

    if (options.failOnMissing && summary.hasMissing) {
      const failureMessage =
        `[validate-org] Validation failed: missing organizationId in ${summary.missingEntities.join(', ')}.`;
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

        console.info(
          `[validate-org] Completed validation for ${processedCount} entit${
            processedCount === 1 ? 'y' : 'ies'
          }. Missing: ${missingDescription}.`,
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