import { PrismaClient } from '@prisma/client';

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

type PrismaContextClient = PrismaClient & Record<string, any>;

type PopulateOptions = {
  prisma?: PrismaClient;
  logger?: Logger;
  dryRun?: boolean;
  chunkSize?: number;
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
};

type PopulateSummary = {
  defaultOrganizationId: number;
  defaultOrganizationCreated: boolean;
  processed: Record<string, EntitySummary>;
};

type PopulateContext = {
  prisma: PrismaContextClient;
  logger: Logger;
  dryRun: boolean;
  chunkSize: number;
};

const DEFAULT_CHUNK_SIZE = 25;
const DEFAULT_ORGANIZATION_CODE = 'DEFAULT';

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
  };

  if (!plans.length) {
    context.logger.info(`[populate-org] ${entity}: no pending records.`);
    return summary;
  }

  const reasonDescription = formatReasonCounts(summary.reasons);

  if (context.dryRun) {
    context.logger.info(
      `[populate-org] ${entity}: dry-run active, ${plans.length} records would be updated (${reasonDescription}).`,
    );
    return summary;
  }

  const chunks = chunkArray(plans, context.chunkSize);
  for (const chunk of chunks) {
    await executor(chunk);
  }

  summary.updated = plans.length;
  context.logger.info(
    `[populate-org] ${entity}: updated ${plans.length} records (${reasonDescription}).`,
  );

  return summary;
}

async function ensureDefaultOrganization(
  prisma: PrismaContextClient,
  logger: Logger,
): Promise<{ id: number; created: boolean }> {
  const existingByCode = (await prisma.organization.findFirst({
    where: { code: DEFAULT_ORGANIZATION_CODE },
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
      code: DEFAULT_ORGANIZATION_CODE,
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

export async function populateMissingOrganizationIds(
  options: PopulateOptions = {},
): Promise<PopulateSummary> {
  const prisma = options.prisma ?? new PrismaClient();
  const prismaWithAny = prisma as PrismaContextClient;
  const logger = options.logger ?? console;
  const dryRun = options.dryRun ?? false;
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const context: PopulateContext = { prisma: prismaWithAny, logger, dryRun, chunkSize };
  const shouldDisconnect = !options.prisma;

  try {
    const { id: defaultOrganizationId, created } = await ensureDefaultOrganization(prismaWithAny, logger);

    const processed: PopulateSummary['processed'] = {};
    processed.store = await populateStores(context, defaultOrganizationId);
    processed['cash-register'] = await populateCashRegisters(context, defaultOrganizationId);
    processed.user = await populateUsers(context, defaultOrganizationId);
    processed.client = await populateClients(context, defaultOrganizationId);
    processed.inventory = await populateInventory(context, defaultOrganizationId);
    processed['inventory-history'] = await populateInventoryHistory(context, defaultOrganizationId);
    processed.entry = await populateEntries(context, defaultOrganizationId);
    processed.provider = await populateProviders(context, defaultOrganizationId);
    processed.sales = await populateSales(context, defaultOrganizationId);
    processed.transfer = await populateTransfers(context, defaultOrganizationId);
    processed.orders = await populateOrders(context, defaultOrganizationId);
    processed['cash-transaction'] = await populateCashTransactions(context, defaultOrganizationId);
    processed['cash-closure'] = await populateCashClosures(context, defaultOrganizationId);

    return {
      defaultOrganizationId,
      defaultOrganizationCreated: created,
      processed,
    };
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  populateMissingOrganizationIds().catch((error) => {
    console.error('[populate-org] Failed to populate organization identifiers.', error);
    process.exit(1);
  });
}