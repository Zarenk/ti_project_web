import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

type PrismaContextClient = PrismaClient & Record<string, any>;

const POPULATE_ENTITY_KEYS = [
  'store',
  'cash-register',
  'user',
  'client',
  'inventory',
  'inventory-history',
  'entry',
  'provider',
  'sales',
  'transfer',
  'orders',
  'cash-transaction',
  'cash-closure',
] as const;

type PopulateEntityKey = (typeof POPULATE_ENTITY_KEYS)[number];

type PopulateOptions = {
  prisma?: PrismaClient;
  logger?: Logger;
  dryRun?: boolean;
  chunkSize?: number;
  onlyEntities?: PopulateEntityKey[];
  skipEntities?: PopulateEntityKey[];
  defaultOrganizationCode?: string;
  summaryPath?: string;
  summaryStdout?: boolean;
};

type UpdatePlan = {
  id: number;
  organizationId: number;
  reason: string;
};

type EntitySummary = {
  planned: number;
  updated: number;
  reasons: Record<string, number>;
  durationMs: number;
  chunks: number;
};

type PopulateSummary = {
  defaultOrganizationId: number;
  defaultOrganizationCode: string;
  defaultOrganizationCreated: boolean;
  processed: Record<PopulateEntityKey, EntitySummary>;
  generatedAt: string;
  summaryFilePath?: string;
  overall: EntitySummary;
};

type PopulateContext = {
  prisma: PrismaContextClient;
  logger: Logger;
  dryRun: boolean;
  chunkSize: number;
};

const DEFAULT_CHUNK_SIZE = 25;
const DEFAULT_ORGANIZATION_CODE = 'DEFAULT';
const POPULATE_ENTITY_KEY_SET = new Set<PopulateEntityKey>(POPULATE_ENTITY_KEYS);

async function persistSummaryToFile(
  summaryPath: string,
  summary: PopulateSummary,
  logger: Logger,
): Promise<boolean> {
  try {
    await mkdir(dirname(summaryPath), { recursive: true });
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    logger.info(`[populate-org] Summary written to ${summaryPath}.`);
    return true;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    logger.warn(
      `[populate-org] Failed to write summary file at ${summaryPath}: ${details}`,
    );
    return false;
  }
}

function createEmptyEntitySummary(): EntitySummary {
  return { planned: 0, updated: 0, reasons: {}, durationMs: 0, chunks: 0 };
}

function isPopulateEntityKey(value: string): value is PopulateEntityKey {
  return POPULATE_ENTITY_KEY_SET.has(value as PopulateEntityKey);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) {
    return [];
  }

  const effectiveSize = Math.max(size, 1);
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += effectiveSize) {
    chunks.push(items.slice(index, index + effectiveSize));
  }
  return chunks;
}

function countReasons(plans: UpdatePlan[]): Record<string, number> {
  return plans.reduce<Record<string, number>>((accumulator, plan) => {
    accumulator[plan.reason] = (accumulator[plan.reason] ?? 0) + 1;
    return accumulator;
  }, {});
}

function mergeReasonCounts(
  accumulator: Record<string, number>,
  reasons: Record<string, number>,
): Record<string, number> {
  for (const [reason, count] of Object.entries(reasons)) {
    accumulator[reason] = (accumulator[reason] ?? 0) + count;
  }
  return accumulator;
}

function formatReasonCounts(reasons: Record<string, number>): string {
  const entries = Object.entries(reasons);
  if (!entries.length) {
    return 'no-updates';
  }

  return entries
    .map(([reason, count]) => `${reason}=${count}`)
    .join(', ');
}

async function executePlan(
  entity: string,
  plans: UpdatePlan[],
  context: PopulateContext,
  executor: (chunk: UpdatePlan[]) => Promise<unknown>,
): Promise<EntitySummary> {
  const summary: EntitySummary = {
    planned: plans.length,
    updated: 0,
    reasons: countReasons(plans),
    durationMs: 0,
    chunks: 0,
  };
  const startedAt = Date.now();

  if (!plans.length) {
    summary.durationMs = Date.now() - startedAt;
    context.logger.info(
      `[populate-org] ${entity}: no pending records (durationMs=${summary.durationMs}, chunks=0).`,
    );
    return summary;
  }

  const reasonDescription = formatReasonCounts(summary.reasons);

  if (context.dryRun) {
    const chunkCount = chunkArray(plans, context.chunkSize).length;
    summary.chunks = chunkCount;
    summary.durationMs = Date.now() - startedAt;
    context.logger.info(
      `[populate-org] ${entity}: dry-run active, ${plans.length} records would be updated (${reasonDescription}) in ${summary.durationMs}ms across ${chunkCount} chunk(s).`,
    );
    return summary;
  }

  const chunks = chunkArray(plans, context.chunkSize);
  summary.chunks = chunks.length;
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    await executor(chunk);
    summary.updated += chunk.length;
    context.logger.info(
      `[populate-org] ${entity}: chunk ${index + 1}/${chunks.length} updated ${chunk.length} records.`,
    );
  }

  summary.durationMs = Date.now() - startedAt;

  context.logger.info(
    `[populate-org] ${entity}: updated ${summary.updated} records (${reasonDescription}) in ${summary.durationMs}ms across ${summary.chunks} chunk(s).`,
  );

  return summary;
}

async function ensureDefaultOrganization(
  prisma: PrismaContextClient,
  logger: Logger,
  organizationCode: string,
): Promise<{ id: number; created: boolean }> {
  const existingByCode = (await prisma.organization.findFirst({
    where: { code: organizationCode },
    select: { id: true },
  })) as any;

  if (existingByCode) {
    return { id: existingByCode.id, created: false };
  }

  const anyOrganization = (await prisma.organization.findFirst({
    orderBy: { id: 'asc' },
    select: { id: true, code: true },
  })) as any;

  if (anyOrganization) {
    logger.info(
      `[populate-org] Using organization ${anyOrganization.id} (code=${anyOrganization.code ?? 'n/a'}) as default fallback.`,
    );
    return { id: anyOrganization.id, created: false };
  }

  const created = (await prisma.organization.create({
    data: {
      name: 'Organización Única',
      code: organizationCode,
      status: 'ACTIVE',
    },
    select: { id: true },
  })) as any;

  logger.info(`[populate-org] Created default organization with id ${created.id}.`);
  return { id: created.id, created: true };
}

function inferReason(values: Array<[boolean, string]>): string {
  const found = values.find(([condition]) => condition);
  return found ? found[1] : 'fallback:default-organization';
}

async function populateStores(context: PopulateContext, defaultOrganizationId: number) {
  const stores = (await context.prisma.store.findMany({
    where: { organizationId: null } as any,
    select: { id: true } as any,
  })) as any[];

  const plans = stores.map<UpdatePlan>((store) => ({
    id: store.id,
    organizationId: defaultOrganizationId,
    reason: 'fallback:default-organization',
  }));

  return executePlan('store', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.store.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateCashRegisters(context: PopulateContext, defaultOrganizationId: number) {
  const registers = (await context.prisma.cashRegister.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      store: { select: { organizationId: true } as any },
    } as any,
  })) as any[];

  const plans = registers.map<UpdatePlan>((register) => {
    const storeOrg = register.store?.organizationId ?? null;
    const organizationId = storeOrg ?? defaultOrganizationId;
    const reason = inferReason([
      [storeOrg !== null, 'inherit:store'],
    ]);

    return { id: register.id, organizationId, reason };
  });

  return executePlan('cash-register', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.cashRegister.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateUsers(context: PopulateContext, defaultOrganizationId: number) {
  const users = (await context.prisma.user.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      memberships: {
        select: {
          organizationId: true,
          isDefault: true,
        },
        orderBy: { isDefault: 'desc' },
      },
    } as any,
  })) as any[];

  const plans = users
    .map<UpdatePlan | null>((user) => {
      const membership = user.memberships.find((member) => member.isDefault) ?? user.memberships[0];
      const membershipOrg = membership?.organizationId ?? null;
      const organizationId = membershipOrg ?? defaultOrganizationId;
      const reason = inferReason([
        [membership?.isDefault === true, 'inherit:membership-default'],
        [Boolean(membership), 'inherit:membership'],
      ]);

      return {
        id: user.id,
        organizationId,
        reason,
      };
    })
    .filter((plan): plan is UpdatePlan => Boolean(plan));

  return executePlan('user', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.user.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateClients(context: PopulateContext, defaultOrganizationId: number) {
  const clients = (await context.prisma.client.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      user: { select: { organizationId: true } as any },
    } as any,
  })) as any[];

  const plans = clients.map<UpdatePlan>((client) => {
    const userOrg = client.user?.organizationId ?? null;
    const organizationId = userOrg ?? defaultOrganizationId;
    const reason = inferReason([[userOrg !== null, 'inherit:user']]);

    return { id: client.id, organizationId, reason };
  });

  return executePlan('client', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.client.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function buildStoreOrganizationMap(context: PopulateContext, storeIds: number[]) {
  const uniqueIds = Array.from(new Set(storeIds));
  if (!uniqueIds.length) {
    return new Map<number, number | null>();
  }

  const stores = (await context.prisma.store.findMany({
    where: { id: { in: uniqueIds } } as any,
    select: { id: true, organizationId: true } as any,
  })) as any[];

  const map = new Map<number, number | null>();
  for (const store of stores) {
    map.set(store.id, store.organizationId ?? null);
  }

  return map;
}

async function populateInventory(context: PopulateContext, defaultOrganizationId: number) {
  const inventories = (await context.prisma.inventory.findMany({
    where: { organizationId: null } as any,
    select: { id: true, storeId: true } as any,
  })) as any[];

  const storeMap = await buildStoreOrganizationMap(
    context,
    inventories.map((inventory) => inventory.storeId),
  );

  const plans = inventories.map<UpdatePlan>((inventory) => {
    const storeOrg = storeMap.get(inventory.storeId) ?? null;
    const organizationId = storeOrg ?? defaultOrganizationId;
    const reason = inferReason([[storeOrg !== null, 'inherit:store']]);

    return { id: inventory.id, organizationId, reason };
  });

  return executePlan('inventory', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.inventory.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateInventoryHistory(context: PopulateContext, defaultOrganizationId: number) {
  const histories = (await context.prisma.inventoryHistory.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      inventoryId: true,
      inventory: {
        select: {
          organizationId: true,
          storeId: true,
        } as any,
      },
    } as any,
  })) as any[];

  const storeMap = await buildStoreOrganizationMap(
    context,
    histories
      .map((history) => history.inventory?.storeId ?? null)
      .filter((storeId): storeId is number => typeof storeId === 'number'),
  );

  const plans = histories.map<UpdatePlan>((history) => {
    const inventoryOrg = history.inventory?.organizationId ?? null;
    const storeOrg = history.inventory?.storeId
      ? storeMap.get(history.inventory.storeId) ?? null
      : null;
    const organizationId = inventoryOrg ?? storeOrg ?? defaultOrganizationId;
    const reason = inferReason([
      [inventoryOrg !== null, 'inherit:inventory'],
      [storeOrg !== null, 'inherit:store'],
    ]);

    return { id: history.id, organizationId, reason };
  });

  return executePlan('inventory-history', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.inventoryHistory.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateEntries(context: PopulateContext, defaultOrganizationId: number) {
  const entries = (await context.prisma.entry.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      store: { select: { organizationId: true } as any },
      user: { select: { organizationId: true } as any },
    } as any,
  })) as any[];

  const plans = entries.map<UpdatePlan>((entry) => {
    const storeOrg = entry.store?.organizationId ?? null;
    const userOrg = entry.user?.organizationId ?? null;
    const organizationId = storeOrg ?? userOrg ?? defaultOrganizationId;
    const reason = inferReason([
      [storeOrg !== null, 'inherit:store'],
      [userOrg !== null, 'inherit:user'],
    ]);

    return { id: entry.id, organizationId, reason };
  });

  return executePlan('entry', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.entry.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateProviders(context: PopulateContext, defaultOrganizationId: number) {
  const providers = (await context.prisma.provider.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      entrys: {
        where: { organizationId: { not: null } },
        select: { organizationId: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    } as any,
  })) as any[];

  const plans = providers.map<UpdatePlan>((provider) => {
    const entryOrg = provider.entrys[0]?.organizationId ?? null;
    const organizationId = entryOrg ?? defaultOrganizationId;
    const reason = inferReason([[entryOrg !== null, 'inherit:entry']]);

    return { id: provider.id, organizationId, reason };
  });

  return executePlan('provider', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.provider.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateSales(context: PopulateContext, defaultOrganizationId: number) {
  const sales = (await context.prisma.sales.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      store: { select: { organizationId: true } as any },
      client: { select: { organizationId: true } as any },
      user: { select: { organizationId: true } as any },
    } as any,
  })) as any[];

  const plans = sales.map<UpdatePlan>((sale) => {
    const storeOrg = sale.store?.organizationId ?? null;
    const clientOrg = sale.client?.organizationId ?? null;
    const userOrg = sale.user?.organizationId ?? null;
    const organizationId = storeOrg ?? clientOrg ?? userOrg ?? defaultOrganizationId;
    const reason = inferReason([
      [storeOrg !== null, 'inherit:store'],
      [clientOrg !== null, 'inherit:client'],
      [userOrg !== null, 'inherit:user'],
    ]);

    return { id: sale.id, organizationId, reason };
  });

  return executePlan('sales', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.sales.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateTransfers(context: PopulateContext, defaultOrganizationId: number) {
  const transfers = (await context.prisma.transfer.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      sourceStore: { select: { organizationId: true } as any },
      destinationStore: { select: { organizationId: true } as any },
    } as any,
  })) as any[];

  const plans = transfers.map<UpdatePlan>((transfer) => {
    const sourceOrg = transfer.sourceStore?.organizationId ?? null;
    const destinationOrg = transfer.destinationStore?.organizationId ?? null;
    const organizationId = sourceOrg ?? destinationOrg ?? defaultOrganizationId;
    const reason = inferReason([
      [sourceOrg !== null, 'inherit:source-store'],
      [destinationOrg !== null, 'inherit:destination-store'],
    ]);

    return { id: transfer.id, organizationId, reason };
  });

  return executePlan('transfer', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.transfer.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateOrders(context: PopulateContext, defaultOrganizationId: number) {
  const orders = (await context.prisma.orders.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      sale: {
        select: {
          organizationId: true,
          store: { select: { organizationId: true } as any },
        },
      },
    } as any,
  })) as any[];

  const plans = orders.map<UpdatePlan>((order) => {
    const saleOrg = order.sale?.organizationId ?? order.sale?.store?.organizationId ?? null;
    const organizationId = saleOrg ?? defaultOrganizationId;
    const reason = inferReason([[saleOrg !== null, 'inherit:sale']]);

    return { id: order.id, organizationId, reason };
  });

  return executePlan('orders', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.orders.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateCashTransactions(context: PopulateContext, defaultOrganizationId: number) {
  const transactions = (await context.prisma.cashTransaction.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      cashRegister: {
        select: {
          organizationId: true,
          store: { select: { organizationId: true } as any },
        },
      },
      user: { select: { organizationId: true } as any },
    } as any,
  })) as any[];

  const plans = transactions.map<UpdatePlan>((transaction) => {
    const registerOrg = transaction.cashRegister?.organizationId ?? null;
    const storeOrg = transaction.cashRegister?.store?.organizationId ?? null;
    const userOrg = transaction.user?.organizationId ?? null;
    const organizationId = registerOrg ?? storeOrg ?? userOrg ?? defaultOrganizationId;
    const reason = inferReason([
      [registerOrg !== null, 'inherit:cash-register'],
      [storeOrg !== null, 'inherit:store'],
      [userOrg !== null, 'inherit:user'],
    ]);

    return { id: transaction.id, organizationId, reason };
  });

  return executePlan('cash-transaction', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.cashTransaction.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

async function populateCashClosures(context: PopulateContext, defaultOrganizationId: number) {
  const closures = (await context.prisma.cashClosure.findMany({
    where: { organizationId: null } as any,
    select: {
      id: true,
      cashRegister: {
        select: {
          organizationId: true,
          store: { select: { organizationId: true } as any },
        },
      },
      user: { select: { organizationId: true } as any },
    } as any,
  })) as any[];

  const plans = closures.map<UpdatePlan>((closure) => {
    const registerOrg = closure.cashRegister?.organizationId ?? null;
    const storeOrg = closure.cashRegister?.store?.organizationId ?? null;
    const userOrg = closure.user?.organizationId ?? null;
    const organizationId = registerOrg ?? storeOrg ?? userOrg ?? defaultOrganizationId;
    const reason = inferReason([
      [registerOrg !== null, 'inherit:cash-register'],
      [storeOrg !== null, 'inherit:store'],
      [userOrg !== null, 'inherit:user'],
    ]);

    return { id: closure.id, organizationId, reason };
  });

  return executePlan('cash-closure', plans, context, (chunk) =>
    context.prisma.$transaction(
      chunk.map((plan) =>
        context.prisma.cashClosure.update({
          where: { id: plan.id },
          data: { organizationId: plan.organizationId } as any,
        }) as any,
      ),
    ),
  );
}

const ENTITY_POPULATORS: ReadonlyArray<{
  key: PopulateEntityKey;
  handler: (context: PopulateContext, defaultOrganizationId: number) => Promise<EntitySummary>;
}> = [
  { key: 'store', handler: populateStores },
  { key: 'cash-register', handler: populateCashRegisters },
  { key: 'user', handler: populateUsers },
  { key: 'client', handler: populateClients },
  { key: 'inventory', handler: populateInventory },
  { key: 'inventory-history', handler: populateInventoryHistory },
  { key: 'entry', handler: populateEntries },
  { key: 'provider', handler: populateProviders },
  { key: 'sales', handler: populateSales },
  { key: 'transfer', handler: populateTransfers },
  { key: 'orders', handler: populateOrders },
  { key: 'cash-transaction', handler: populateCashTransactions },
  { key: 'cash-closure', handler: populateCashClosures },
];

export async function populateMissingOrganizationIds(
  options: PopulateOptions = {},
): Promise<PopulateSummary> {
  const prisma = options.prisma ?? new PrismaClient();
  const prismaWithAny = prisma as PrismaContextClient;
  const logger = options.logger ?? console;
  const dryRun = options.dryRun ?? false;
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const onlyEntities = options.onlyEntities ?? [];
  const skipEntities = options.skipEntities ?? [];
  const trimmedDefaultCode = options.defaultOrganizationCode?.trim();

  if (typeof trimmedDefaultCode === 'string' && trimmedDefaultCode.length === 0) {
    throw new Error('[populate-org] defaultOrganizationCode cannot be empty.');
  }

  const defaultOrganizationCode = trimmedDefaultCode ?? DEFAULT_ORGANIZATION_CODE;

  for (const entity of onlyEntities) {
    if (!isPopulateEntityKey(entity)) {
      throw new Error(`[populate-org] Unknown entity provided in onlyEntities: ${entity}`);
    }
  }

  for (const entity of skipEntities) {
    if (!isPopulateEntityKey(entity)) {
      throw new Error(`[populate-org] Unknown entity provided in skipEntities: ${entity}`);
    }
  }

  const effectiveOnly = onlyEntities.length ? new Set(onlyEntities) : new Set<PopulateEntityKey>(POPULATE_ENTITY_KEYS);
  const skipSet = new Set(skipEntities);
  const enabledEntities = POPULATE_ENTITY_KEYS.filter((entity) => effectiveOnly.has(entity) && !skipSet.has(entity));
  const enabledSet = new Set(enabledEntities);
  const hasCustomSelection = onlyEntities.length > 0 || skipEntities.length > 0;

  const processed = POPULATE_ENTITY_KEYS.reduce((accumulator, key) => {
    accumulator[key] = createEmptyEntitySummary();
    return accumulator;
  }, {} as Record<PopulateEntityKey, EntitySummary>);
  const overall = createEmptyEntitySummary();
  const context: PopulateContext = { prisma: prismaWithAny, logger, dryRun, chunkSize };
  const shouldDisconnect = !options.prisma;

  try {
    const { id: defaultOrganizationId, created } = await ensureDefaultOrganization(
      prismaWithAny,
      logger,
      defaultOrganizationCode,
    );

    for (const { key, handler } of ENTITY_POPULATORS) {
      if (!enabledSet.has(key)) {
        if (hasCustomSelection) {
          logger.info(`[populate-org] ${key}: skipped by configuration.`);
        }
        continue;
      }

      processed[key] = await handler(context, defaultOrganizationId);
    }

    if (!enabledSet.size) {
      logger.warn('[populate-org] No entities selected for population.');
    } else {
      const totalUpdated = Array.from(enabledSet).reduce(
        (accumulator, entity) => accumulator + processed[entity].updated,
        0,
      );
      logger.info(
        `[populate-org] Summary: processed ${enabledSet.size} entities, updated ${totalUpdated} records.`,
      );

      for (const entity of POPULATE_ENTITY_KEYS) {
        if (!enabledSet.has(entity)) {
          continue;
        }

        const entitySummary = processed[entity];
        overall.planned += entitySummary.planned;
        overall.updated += entitySummary.updated;
        overall.chunks += entitySummary.chunks;
        mergeReasonCounts(overall.reasons, entitySummary.reasons);
        overall.durationMs += entitySummary.durationMs;
        logger.info(
          `[populate-org] Summary ${entity}: planned=${entitySummary.planned}, updated=${entitySummary.updated}, chunks=${entitySummary.chunks}, reasons=${formatReasonCounts(entitySummary.reasons)}, durationMs=${entitySummary.durationMs}.`,
        );
      }

      logger.info(
        `[populate-org] Summary overall: planned=${overall.planned}, updated=${overall.updated}, chunks=${overall.chunks}, reasons=${formatReasonCounts(overall.reasons)}, durationMs=${overall.durationMs}.`,
      );
    }

    const summary: PopulateSummary = {
      defaultOrganizationId,
      defaultOrganizationCode,
      defaultOrganizationCreated: created,
      processed,
      generatedAt: new Date().toISOString(),
      overall,
    };

    if (options.summaryPath) {
      const persisted = await persistSummaryToFile(options.summaryPath, summary, logger);
      if (persisted) {
        summary.summaryFilePath = options.summaryPath;
      }
    }

    if (options.summaryStdout) {
      logger.info('[populate-org] Summary JSON:', JSON.stringify(summary, null, 2));
    }

    return summary;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

type CliOptions = Pick<
  PopulateOptions,
  | 'dryRun'
  | 'chunkSize'
  | 'onlyEntities'
  | 'skipEntities'
  | 'defaultOrganizationCode'
  | 'summaryPath'
  | 'summaryStdout'
>;

function parseListArgument(
  flag: string,
  value: string | undefined,
): PopulateEntityKey[] {
  if (!value) {
    throw new Error(`[populate-org] Missing value for ${flag}.`);
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (!items.length) {
    throw new Error(`[populate-org] ${flag} requires at least one entity.`);
  }

  const unique = Array.from(new Set(items));
  const entities: PopulateEntityKey[] = [];

  for (const item of unique) {
    if (!isPopulateEntityKey(item)) {
      throw new Error(`[populate-org] Unknown entity provided for ${flag}: ${item}`);
    }
    entities.push(item);
  }

  return entities;
}

function parseNumericArgument(flag: string, value: string | undefined): number {
  if (!value) {
    throw new Error(`[populate-org] Missing value for ${flag}.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[populate-org] ${flag} must be a positive number.`);
  }

  return parsed;
}

function parseStringArgument(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[populate-org] Missing value for ${flag}.`);
  }

  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new Error(`[populate-org] ${flag} cannot be empty.`);
  }

  return trimmed;
}

export function parsePopulateOrganizationCliArgs(argv: string[]): CliOptions {
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

    if (arg === '--dry-run' || arg === '--dryRun') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--chunk-size=')) {
      options.chunkSize = parseNumericArgument('--chunk-size', arg.split('=')[1]);
      continue;
    }

    if (arg === '--chunk-size' || arg === '--chunkSize') {
      const [value, nextIndex] = nextValue(argv, index);
      options.chunkSize = parseNumericArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--only=') || arg.startsWith('--only-entities=')) {
      const [, raw] = arg.split('=');
      options.onlyEntities = parseListArgument(arg.split('=')[0], raw);
      continue;
    }

    if (arg === '--only' || arg === '--only-entities' || arg === '--onlyEntities') {
      const [value, nextIndex] = nextValue(argv, index);
      options.onlyEntities = parseListArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--skip=') || arg.startsWith('--skip-entities=')) {
      const [, raw] = arg.split('=');
      options.skipEntities = parseListArgument(arg.split('=')[0], raw);
      continue;
    }

    if (arg === '--skip' || arg === '--skip-entities' || arg === '--skipEntities') {
      const [value, nextIndex] = nextValue(argv, index);
      options.skipEntities = parseListArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--default-org-code=') || arg.startsWith('--default-organization-code=')) {
      const [flag, raw] = arg.split('=');
      options.defaultOrganizationCode = parseStringArgument(flag, raw);
      continue;
    }

    if (
      arg === '--default-org-code' ||
      arg === '--default-organization-code' ||
      arg === '--defaultOrgCode' ||
      arg === '--defaultOrganizationCode'
    ) {
      const [value, nextIndex] = nextValue(argv, index);
      options.defaultOrganizationCode = parseStringArgument(arg, value);
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
      arg === '--summary-stdout' ||
      arg === '--summaryStdout' ||
      arg === '--summary-json' ||
      arg === '--summaryJson'
    ) {
      options.summaryStdout = true;
      continue;
    }

    if (arg.trim().length > 0) {
      throw new Error(`[populate-org] Unknown argument: ${arg}`);
    }
  }

  return options;
}

if (require.main === module) {
  try {
    const cliOptions = parsePopulateOrganizationCliArgs(process.argv.slice(2));
    populateMissingOrganizationIds(cliOptions)
      .then((summary) => {
        console.info(
          `[populate-org] Completed. defaultOrganizationId=${summary.defaultOrganizationId} defaultOrganizationCode=${summary.defaultOrganizationCode} created=${summary.defaultOrganizationCreated ? 'yes' : 'no'}.`,
        );

        if (summary.summaryFilePath) {
          console.info(
            `[populate-org] Summary file available at ${summary.summaryFilePath}.`,
          );
        }

        for (const entity of POPULATE_ENTITY_KEYS) {
          const stats = summary.processed[entity];
          console.info(
            `[populate-org] ${entity}: planned=${stats.planned}, updated=${stats.updated}, chunks=${stats.chunks}, reasons=${formatReasonCounts(stats.reasons)}.`,
          );
        }

        console.info(
          `[populate-org] overall: planned=${summary.overall.planned}, updated=${summary.overall.updated}, chunks=${summary.overall.chunks}, reasons=${formatReasonCounts(summary.overall.reasons)}.`,
        );
      })
      .catch((error) => {
        console.error('[populate-org] Failed to populate organization identifiers.', error);
        process.exit(1);
      });
  } catch (error) {
    console.error('[populate-org] Failed to parse CLI arguments.', error);
    process.exit(1);
  }
}