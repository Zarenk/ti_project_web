import type { PrismaClient } from '@prisma/client';
import {
  populateMissingOrganizationIds,
  parsePopulateOrganizationCliArgs,
} from './populate-organization-ids.seed';

type AsyncMock<T = unknown> = jest.Mock<Promise<T>, any[]>;

type PrismaMock = {
  organization: {
    findFirst: AsyncMock<{ id: number; code?: string } | null>;
    create: AsyncMock<{ id: number }>;
  };
  store: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  cashRegister: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  user: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  client: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  inventory: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  inventoryHistory: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  entry: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  provider: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  sales: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  transfer: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  orders: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  cashTransaction: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  cashClosure: {
    findMany: AsyncMock<any[]>;
    update: AsyncMock;
  };
  $transaction: AsyncMock<any>;
  $disconnect: AsyncMock<void>;
};

const buildPrismaMock = (): PrismaMock => {
  const storeFindMany = jest.fn<Promise<any[]>, any[]>(async (args) => {
    if (args?.where?.organizationId === null) {
      return [{ id: 101 }];
    }
    if (args?.where?.id?.in) {
      return [{ id: 101, organizationId: 1 }];
    }
    return [];
  });

  const organizationFindFirst = jest.fn<Promise<{ id: number; code?: string } | null>, any[]>();
  organizationFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

  const prisma: PrismaMock = {
    organization: {
      findFirst: organizationFindFirst,
      create: jest.fn(async () => ({ id: 1 })),
    },
    store: {
      findMany: storeFindMany,
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    cashRegister: {
      findMany: jest.fn(async () => [
        { id: 201, store: { organizationId: 1 } },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    user: {
      findMany: jest.fn(async () => [
        { id: 301, memberships: [{ organizationId: 2, isDefault: true }] },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    client: {
      findMany: jest.fn(async () => [
        { id: 401, user: { organizationId: 2 } },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    inventory: {
      findMany: jest.fn(async () => [
        { id: 501, storeId: 101 },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    inventoryHistory: {
      findMany: jest.fn(async () => [
        {
          id: 601,
          inventoryId: 501,
          inventory: { organizationId: 1, storeId: 101 },
        },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    entry: {
      findMany: jest.fn(async () => [
        {
          id: 701,
          store: { organizationId: 1 },
          user: { organizationId: 2 },
        },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    provider: {
      findMany: jest.fn(async () => [
        {
          id: 801,
          entrys: [{ organizationId: 1 }],
        },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    sales: {
      findMany: jest.fn(async () => [
        {
          id: 901,
          store: { organizationId: 1 },
          client: { organizationId: 2 },
          user: { organizationId: 2 },
        },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    transfer: {
      findMany: jest.fn(async () => [
        {
          id: 1001,
          sourceStore: { organizationId: 1 },
          destinationStore: { organizationId: null },
        },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    orders: {
      findMany: jest.fn(async () => [
        {
          id: 1101,
          sale: { organizationId: 1, store: { organizationId: 1 } },
        },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    cashTransaction: {
      findMany: jest.fn(async () => [
        {
          id: 1201,
          cashRegister: { organizationId: 1, store: { organizationId: 1 } },
          user: { organizationId: 2 },
        },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    cashClosure: {
      findMany: jest.fn(async () => [
        {
          id: 1301,
          cashRegister: { organizationId: 1, store: { organizationId: 1 } },
          user: { organizationId: 2 },
        },
      ]),
      update: jest.fn(async ({ where: { id }, data: { organizationId } }) => ({ id, organizationId })),
    },
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => {
      await Promise.all(operations);
    }),
    $disconnect: jest.fn(async () => undefined),
  };

  return prisma;
};

describe('populateMissingOrganizationIds', () => {
  it('fills organizationId across dependent entities using fallback rules', async () => {
    const prisma = buildPrismaMock();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const summary = await populateMissingOrganizationIds({
      prisma: prisma as unknown as PrismaClient,
      logger,
    });

    expect(summary.defaultOrganizationId).toBe(1);
    expect(summary.defaultOrganizationCreated).toBe(true);

    expect(prisma.store.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: { organizationId: 1 },
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 301 },
      data: { organizationId: 2 },
    });

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 401 },
      data: { organizationId: 2 },
    });

    expect(prisma.inventory.update).toHaveBeenCalledWith({
      where: { id: 501 },
      data: { organizationId: 1 },
    });

    expect(prisma.entry.update).toHaveBeenCalledWith({
      where: { id: 701 },
      data: { organizationId: 1 },
    });

    expect(prisma.provider.update).toHaveBeenCalledWith({
      where: { id: 801 },
      data: { organizationId: 1 },
    });

    expect(prisma.sales.update).toHaveBeenCalledWith({
      where: { id: 901 },
      data: { organizationId: 1 },
    });

    expect(prisma.transfer.update).toHaveBeenCalledWith({
      where: { id: 1001 },
      data: { organizationId: 1 },
    });

    expect(prisma.orders.update).toHaveBeenCalledWith({
      where: { id: 1101 },
      data: { organizationId: 1 },
    });

    expect(prisma.cashTransaction.update).toHaveBeenCalledWith({
      where: { id: 1201 },
      data: { organizationId: 1 },
    });

    expect(prisma.cashClosure.update).toHaveBeenCalledWith({
      where: { id: 1301 },
      data: { organizationId: 1 },
    });

    expect(summary.processed.store.updated).toBe(1);
    expect(summary.processed['cash-register'].updated).toBe(1);
    expect(summary.processed.user.updated).toBe(1);
    expect(summary.processed.client.updated).toBe(1);
    expect(summary.processed.inventory.updated).toBe(1);
    expect(summary.processed['inventory-history'].updated).toBe(1);
    expect(summary.processed.entry.updated).toBe(1);
    expect(summary.processed.provider.updated).toBe(1);
    expect(summary.processed.sales.updated).toBe(1);
    expect(summary.processed.transfer.updated).toBe(1);
    expect(summary.processed.orders.updated).toBe(1);
    expect(summary.processed['cash-transaction'].updated).toBe(1);
    expect(summary.processed['cash-closure'].updated).toBe(1);

    expect(prisma.$disconnect).not.toHaveBeenCalled();
  });

  it('supports dry-run mode without executing updates', async () => {
    const prisma = buildPrismaMock();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const summary = await populateMissingOrganizationIds({
      prisma: prisma as unknown as PrismaClient,
      logger,
      dryRun: true,
    });

    expect(summary.processed.store.updated).toBe(0);
    expect(prisma.store.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows filtering the entities to process', async () => {
    const prisma = buildPrismaMock();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const options = {
      prisma: prisma as unknown as PrismaClient,
      logger,
      onlyEntities: ['store', 'user'],
      skipEntities: ['user'],
    } as any;

    const summary = await populateMissingOrganizationIds(options);

    expect(prisma.store.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.client.update).not.toHaveBeenCalled();

    expect(summary.processed.store.updated).toBe(1);
    expect(summary.processed.user.updated).toBe(0);
    expect(summary.processed.client.updated).toBe(0);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('[populate-org] user: skipped by configuration.');
  });
});

describe('parsePopulateOrganizationCliArgs', () => {
  it('parses boolean, numeric and list arguments', () => {
    const options = parsePopulateOrganizationCliArgs([
      '--dry-run',
      '--chunk-size',
      '50',
      '--only',
      'store,client',
      '--skip=client',
    ]);

    expect(options).toEqual({
      dryRun: true,
      chunkSize: 50,
      onlyEntities: ['store', 'client'],
      skipEntities: ['client'],
    });
  });

  it('throws on invalid entities', () => {
    expect(() => parsePopulateOrganizationCliArgs(['--only', 'unknown'])).toThrow(
      '[populate-org] Unknown entity provided for --only: unknown',
    );
  });

  it('throws on unknown arguments', () => {
    expect(() => parsePopulateOrganizationCliArgs(['--unexpected'])).toThrow(
      '[populate-org] Unknown argument: --unexpected',
    );
  });
});