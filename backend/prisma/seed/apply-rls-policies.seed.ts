import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { POPULATE_ENTITY_KEYS, type PopulateEntityKey } from './populate-organization-ids.seed';

const DEFAULT_SESSION_VARIABLE = 'app.current_organization_id';
const DEFAULT_POLICY_PREFIX = 'rls_org';
const DEFAULT_POLICY_ROLES = ['PUBLIC'];

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

type PrismaLike = Pick<PrismaClient, '$executeRawUnsafe' | '$disconnect'>;

type ApplyRlsOptions = {
  prisma?: PrismaLike;
  logger?: Logger;
  dryRun?: boolean;
  disable?: boolean;
  force?: boolean;
  onlyEntities?: PopulateEntityKey[];
  skipEntities?: PopulateEntityKey[];
  policyPrefix?: string;
  policyRoles?: string[];
  sessionVariable?: string;
  summaryPath?: string;
  summaryStdout?: boolean;
};

type ApplyRlsResult = {
  statements: Array<{
    entity: PopulateEntityKey;
    applied: string[];
  }>;
  summary: ApplyRlsSummary;
};

type CliOptions = Omit<
  ApplyRlsOptions,
  'prisma' | 'logger'
>;

type ApplyRlsSummaryEntry = {
  entity: PopulateEntityKey;
  statements: string[];
  statementCount: number;
};

type ApplyRlsSummary = {
  dryRun: boolean;
  disable: boolean;
  force: boolean;
  policyPrefix: string;
  policyRoles: string[];
  sessionVariable: string;
  generatedAt: string;
  totalStatements: number;
  entries: ApplyRlsSummaryEntry[];
  summaryFilePath?: string;
};

const ENTITY_TABLES: Record<PopulateEntityKey, { table: string; column: string }>
  = {
    store: { table: '"Store"', column: '"organizationId"' },
    'cash-register': { table: '"cash_registers"', column: '"organizationId"' },
    user: { table: '"User"', column: '"organizationId"' },
    client: { table: '"Client"', column: '"organizationId"' },
    inventory: { table: '"Inventory"', column: '"organizationId"' },
    'inventory-history': {
      table: '"InventoryHistory"',
      column: '"organizationId"',
    },
    entry: { table: '"Entry"', column: '"organizationId"' },
    provider: { table: '"Provider"', column: '"organizationId"' },
    sales: { table: '"Sales"', column: '"organizationId"' },
    transfer: { table: '"Transfer"', column: '"organizationId"' },
    orders: { table: '"Orders"', column: '"organizationId"' },
    'cash-transaction': {
      table: '"cash_transactions"',
      column: '"organizationId"',
    },
    'cash-closure': {
      table: '"cash_closures"',
      column: '"organizationId"',
    },
  };

const ENTITY_KEY_SET = new Set<PopulateEntityKey>(POPULATE_ENTITY_KEYS);

function sanitizePolicySuffix(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

function pickEntities(
  only?: PopulateEntityKey[],
  skip?: PopulateEntityKey[],
): PopulateEntityKey[] {
  const skipSet = new Set(skip ?? []);
  const base =
    only !== undefined
      ? only.length
        ? only
        : []
      : POPULATE_ENTITY_KEYS;
  return base.filter((key) => ENTITY_KEY_SET.has(key) && !skipSet.has(key));
}

function buildCondition(
  column: string,
  sessionVariable: string,
): string {
  const sessionExpr = `NULLIF(current_setting('${sessionVariable}', true), '')`;
  return `(${sessionExpr} IS NULL OR ${column} IS NULL OR ${column} = (${sessionExpr})::int)`;
}

function createStatements(
  entity: PopulateEntityKey,
  table: string,
  column: string,
  sessionVariable: string,
  policyPrefix: string,
  policyRoles: string[],
  options: { disable: boolean; force: boolean },
): string[] {
  const policyName = `${policyPrefix}_${sanitizePolicySuffix(entity)}`;
  const condition = buildCondition(column, sessionVariable);
  const rolesClause = policyRoles.join(', ');

  if (options.disable) {
    return [
      `DROP POLICY IF EXISTS "${policyName}" ON ${table}`,
      `ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`,
      `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`,
    ];
  }

  return [
    `DROP POLICY IF EXISTS "${policyName}" ON ${table}`,
    `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE ${table} ${options.force ? 'FORCE' : 'NO FORCE'} ROW LEVEL SECURITY`,
    `CREATE POLICY "${policyName}" ON ${table} FOR ALL TO ${rolesClause} USING ${condition} WITH CHECK ${condition}`,
  ];
}

async function persistSummaryToFile(
  summaryPath: string,
  summary: ApplyRlsSummary,
  logger: Logger,
): Promise<boolean> {
  try {
    await mkdir(dirname(summaryPath), { recursive: true });
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    logger.info(`[apply-rls] Summary written to ${summaryPath}.`);
    return true;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    logger.warn(`[apply-rls] Failed to write summary at ${summaryPath}: ${details}`);
    return false;
  }
}

async function finalizeSummary(
  executed: ApplyRlsResult['statements'],
  context: {
    dryRun: boolean;
    disable: boolean;
    force: boolean;
    policyPrefix: string;
    policyRoles: string[];
    sessionVariable: string;
    summaryPath?: string;
    summaryStdout?: boolean;
    logger: Logger;
  },
): Promise<ApplyRlsSummary> {
  const entries: ApplyRlsSummaryEntry[] = executed.map((entry) => ({
    entity: entry.entity,
    statements: entry.applied,
    statementCount: entry.applied.length,
  }));

  if (!entries.length) {
    context.logger.info('[apply-rls] No statements were generated for the selected entities.');
  } else {
    for (const entry of entries) {
      context.logger.info(
        `[apply-rls] Summary ${entry.entity}: statements=${entry.statementCount}.`,
      );
    }
  }

  const totalStatements = entries.reduce(
    (accumulator, entry) => accumulator + entry.statementCount,
    0,
  );

  context.logger.info(`[apply-rls] Summary overall: statements=${totalStatements}.`);

  const summary: ApplyRlsSummary = {
    dryRun: context.dryRun,
    disable: context.disable,
    force: context.force,
    policyPrefix: context.policyPrefix,
    policyRoles: context.policyRoles,
    sessionVariable: context.sessionVariable,
    generatedAt: new Date().toISOString(),
    totalStatements,
    entries,
  };

  if (context.summaryPath) {
    const persisted = await persistSummaryToFile(
      context.summaryPath,
      summary,
      context.logger,
    );
    if (persisted) {
      summary.summaryFilePath = context.summaryPath;
    }
  }

  if (context.summaryStdout) {
    context.logger.info('[apply-rls] Summary JSON:', JSON.stringify(summary, null, 2));
  }

  return summary;
}

export async function applyRlsPolicies(
  options: ApplyRlsOptions = {},
): Promise<ApplyRlsResult> {
  const logger = options.logger ?? console;
  const prisma = options.prisma ?? new PrismaClient();
  const shouldDisconnect = !options.prisma;

  const dryRun = Boolean(options.dryRun);
  const disable = Boolean(options.disable);
  const force = Boolean(options.force);
  const policyPrefix = options.policyPrefix ?? DEFAULT_POLICY_PREFIX;
  const policyRoles = (options.policyRoles ?? DEFAULT_POLICY_ROLES).map((role) =>
    role.trim().length ? role.trim() : 'PUBLIC',
  );
  const sessionVariable = options.sessionVariable ?? DEFAULT_SESSION_VARIABLE;

  const entities = pickEntities(options.onlyEntities, options.skipEntities);

  if (!entities.length) {
    logger.warn('[apply-rls] No entities matched the provided filters.');
    const summary = await finalizeSummary([], {
      dryRun,
      disable,
      force,
      policyPrefix,
      policyRoles,
      sessionVariable,
      summaryPath: options.summaryPath,
      summaryStdout: options.summaryStdout,
      logger,
    });
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
    return { statements: [], summary };
  }

  const executed: ApplyRlsResult['statements'] = [];

  try {
    for (const entity of entities) {
      const config = ENTITY_TABLES[entity];
      if (!config) {
        logger.warn(`[apply-rls] No configuration found for entity ${entity}, skipping.`);
        continue;
      }

      const statements = createStatements(
        entity,
        config.table,
        config.column,
        sessionVariable,
        policyPrefix,
        policyRoles,
        { disable, force },
      );

      executed.push({ entity, applied: statements });

      for (const statement of statements) {
        if (dryRun) {
          logger.info(`[apply-rls] (dry-run) ${statement}`);
          continue;
        }

        logger.info(`[apply-rls] Executing: ${statement}`);
        await prisma.$executeRawUnsafe(statement);
      }
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    logger.error(`[apply-rls] Failed to ${disable ? 'disable' : 'apply'} RLS: ${details}`);
    throw error;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }

  const summary = await finalizeSummary(executed, {
    dryRun,
    disable,
    force,
    policyPrefix,
    policyRoles,
    sessionVariable,
    summaryPath: options.summaryPath,
    summaryStdout: options.summaryStdout,
    logger,
  });

  return { statements: executed, summary };
}

function parseBooleanFlag(
  flag: string,
  raw: string | undefined,
): { value: boolean; consumed: number } {
  if (raw === undefined || raw.startsWith('--')) {
    return { value: true, consumed: 0 };
  }

  const normalized = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return { value: true, consumed: 1 };
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return { value: false, consumed: 1 };
  }

  throw new Error(`Invalid boolean value for ${flag}: ${raw}`);
}

function parseListArgument(flag: string, value: string | undefined): string[] {
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStringArgument(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function nextValue(argv: string[], index: number): [string | undefined, number] {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    return [undefined, index];
  }
  return [value, index + 1];
}

export function parseApplyRlsCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg.startsWith('--dry-run=')) {
      const [, raw] = arg.split('=');
      options.dryRun = parseBooleanFlag('--dry-run', raw).value;
      continue;
    }

    if (arg === '--dry-run') {
      const { value, consumed } = parseBooleanFlag(arg, argv[index + 1]);
      options.dryRun = value;
      index += consumed;
      continue;
    }

    if (arg.startsWith('--disable=')) {
      const [, raw] = arg.split('=');
      options.disable = parseBooleanFlag('--disable', raw).value;
      continue;
    }

    if (arg === '--disable') {
      const { value, consumed } = parseBooleanFlag(arg, argv[index + 1]);
      options.disable = value;
      index += consumed;
      continue;
    }

    if (arg.startsWith('--force=')) {
      const [, raw] = arg.split('=');
      options.force = parseBooleanFlag('--force', raw).value;
      continue;
    }

    if (arg === '--force') {
      const { value, consumed } = parseBooleanFlag(arg, argv[index + 1]);
      options.force = value;
      index += consumed;
      continue;
    }

    if (arg.startsWith('--only=')) {
      const [, raw] = arg.split('=');
      options.onlyEntities = parseListArgument('--only', raw) as PopulateEntityKey[];
      continue;
    }

    if (arg === '--only') {
      const [value, next] = nextValue(argv, index);
      options.onlyEntities = parseListArgument(arg, value) as PopulateEntityKey[];
      index = next;
      continue;
    }

    if (arg.startsWith('--skip=')) {
      const [, raw] = arg.split('=');
      options.skipEntities = parseListArgument('--skip', raw) as PopulateEntityKey[];
      continue;
    }

    if (arg === '--skip') {
      const [value, next] = nextValue(argv, index);
      options.skipEntities = parseListArgument(arg, value) as PopulateEntityKey[];
      index = next;
      continue;
    }

    if (arg.startsWith('--policy-prefix=')) {
      const [, raw] = arg.split('=');
      options.policyPrefix = parseStringArgument('--policy-prefix', raw);
      continue;
    }

    if (arg === '--policy-prefix') {
      const [value, next] = nextValue(argv, index);
      options.policyPrefix = parseStringArgument(arg, value);
      index = next;
      continue;
    }

    if (arg.startsWith('--session-variable=')) {
      const [, raw] = arg.split('=');
      options.sessionVariable = parseStringArgument('--session-variable', raw);
      continue;
    }

    if (arg === '--session-variable') {
      const [value, next] = nextValue(argv, index);
      options.sessionVariable = parseStringArgument(arg, value);
      index = next;
      continue;
    }

    if (arg.startsWith('--roles=')) {
      const [, raw] = arg.split('=');
      options.policyRoles = parseListArgument('--roles', raw);
      continue;
    }

    if (arg === '--roles') {
      const [value, next] = nextValue(argv, index);
      options.policyRoles = parseListArgument(arg, value);
      index = next;
      continue;
    }

    if (arg.startsWith('--summary-path=')) {
      const [, raw] = arg.split('=');
      options.summaryPath = parseStringArgument('--summary-path', raw);
      continue;
    }

    if (arg.startsWith('--summaryPath=')) {
      const [, raw] = arg.split('=');
      options.summaryPath = parseStringArgument('--summaryPath', raw);
      continue;
    }

    if (arg === '--summary-path' || arg === '--summaryPath') {
      const [value, next] = nextValue(argv, index);
      options.summaryPath = parseStringArgument(arg, value);
      index = next;
      continue;
    }

    if (arg.startsWith('--summary-stdout=')) {
      const [, raw] = arg.split('=');
      options.summaryStdout = parseBooleanFlag('--summary-stdout', raw).value;
      continue;
    }

    if (arg.startsWith('--summaryStdout=')) {
      const [, raw] = arg.split('=');
      options.summaryStdout = parseBooleanFlag('--summaryStdout', raw).value;
      continue;
    }

    if (arg === '--summary-stdout' || arg === '--summaryStdout') {
      const { value, consumed } = parseBooleanFlag(arg, argv[index + 1]);
      options.summaryStdout = value;
      index += consumed;
      continue;
    }
  }

  return options;
}

if (require.main === module) {
  (async () => {
    const cliOptions = parseApplyRlsCliArgs(process.argv.slice(2));
    await applyRlsPolicies(cliOptions);
  })().catch((error) => {
    const details = error instanceof Error ? error.stack ?? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error('[apply-rls] Execution failed', details);
    process.exitCode = 1;
  });
}