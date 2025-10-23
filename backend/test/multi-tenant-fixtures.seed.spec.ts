import type { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $disconnect: jest.fn(async () => undefined),
  })),
  UserRole: {
    SUPER_ADMIN_GLOBAL: 'SUPER_ADMIN_GLOBAL',
    SUPER_ADMIN_ORG: 'SUPER_ADMIN_ORG',
    ADMIN: 'ADMIN',
    EMPLOYEE: 'EMPLOYEE',
    CLIENT: 'CLIENT',
    GUEST: 'GUEST',
  },
  OrganizationMembershipRole: {
    OWNER: 'OWNER',
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER',
    VIEWER: 'VIEWER',
  },
}));

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(() => Promise.resolve(undefined)),
  writeFile: jest.fn(() => Promise.resolve(undefined)),
}));

import { mkdir, writeFile } from 'node:fs/promises';

import { applyMultiTenantFixtures } from '../prisma/seed/multi-tenant-fixtures.seed';

type AsyncMock<T = unknown> = jest.Mock<Promise<T>, any[]>;

const mockedMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockedWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;

type MockedPrisma = {
  category: { upsert: AsyncMock<{ id: number }> };
  organization: { upsert: AsyncMock<{ id: number }> };
  organizationUnit: {
    upsert: AsyncMock<{ id: number; organizationId: number }>;
  };
  store: { upsert: AsyncMock<{ id: number; organizationId: number }> };
  provider: { upsert: AsyncMock<{ id: number; create: any; update: any }> };
  user: { upsert: AsyncMock<{ id: number; role: string }> };
  organizationMembership: { upsert: AsyncMock };
  client: { upsert: AsyncMock };
  product: { upsert: AsyncMock<{ id: number }> };
  inventory: { upsert: AsyncMock<{ id: number }> };
  storeOnInventory: {
    findFirst: AsyncMock;
    update: AsyncMock;
    create: AsyncMock<{ id: number }>;
  };
  inventoryHistory: {
    deleteMany: AsyncMock;
    create: AsyncMock;
  };
  $disconnect: AsyncMock<void>;
};

const buildMockPrisma = (): MockedPrisma => {
  const categoryIds = new Map<string, number>([
    ['Electrónicos', 1001],
    ['Periféricos', 1002],
  ]);

  const organizationIds = new Map<string, number>([
    ['tenant-alpha', 1],
    ['tenant-beta', 2],
  ]);

  const unitIds = new Map<string, number>();
  let nextUnitId = 11;

  const storeIds = new Map<string, number>();
  let nextStoreId = 101;

  const userIds = new Map<string, number>();
  let nextUserId = 10001;

  const productIds = new Map<string, number>();
  let nextProductId = 5001;

  const inventoryIds = new Map<string, number>();
  let nextInventoryId = 8001;

  return {
    category: {
      upsert: jest.fn(async ({ where: { name } }) => ({
        id: categoryIds.get(name) ?? 9999,
      })),
    },
    organization: {
      upsert: jest.fn(async ({ where: { code } }) => ({
        id: organizationIds.get(code) ?? 0,
      })),
    },
    organizationUnit: {
      upsert: jest.fn(async ({ create }) => {
        const key = create.code ?? create.name;
        const id = unitIds.get(key) ?? nextUnitId++;
        unitIds.set(key, id);
        return { id, organizationId: create.organizationId };
      }),
    },
    store: {
      upsert: jest.fn(async ({ create }) => {
        const id = storeIds.get(create.name) ?? nextStoreId++;
        storeIds.set(create.name, id);
        return { id, organizationId: create.organizationId };
      }),
    },
    provider: {
      upsert: jest.fn(async ({ create, update }) => ({
        id: 0,
        create,
        update,
      })),
    },
    user: {
      upsert: jest.fn(async ({ where: { email }, create }) => {
        const id = userIds.get(email) ?? nextUserId++;
        userIds.set(email, id);
        return { id, role: create.role };
      }),
    },
    organizationMembership: {
      upsert: jest.fn(async () => ({})),
    },
    client: {
      upsert: jest.fn(async () => ({})),
    },
    product: {
      upsert: jest.fn(async ({ where: { name } }) => {
        const id = productIds.get(name) ?? nextProductId++;
        productIds.set(name, id);
        return { id };
      }),
    },
    inventory: {
      upsert: jest.fn(async ({ where: { productId_storeId } }) => {
        const key = `${productId_storeId.productId}:${productId_storeId.storeId}`;
        const id = inventoryIds.get(key) ?? nextInventoryId++;
        inventoryIds.set(key, id);
        return { id };
      }),
    },
    storeOnInventory: {
      findFirst: jest.fn(async () => null),
      update: jest.fn(async () => ({})),
      create: jest.fn(async () => ({ id: 9001 })),
    },
    inventoryHistory: {
      deleteMany: jest.fn(async () => ({})),
      create: jest.fn(async ({ data }) => data),
    },
    $disconnect: jest.fn(async () => undefined),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedMkdir.mockResolvedValue(undefined);
  mockedWriteFile.mockResolvedValue(undefined);
});

describe('applyMultiTenantFixtures', () => {
  it('propagates organizationId across multi-tenant fixtures', async () => {
    const prisma = buildMockPrisma();
    const logger = jest.fn();

    const summary = await applyMultiTenantFixtures({
      prisma: prisma as unknown as PrismaClient,
      logger,
    });

    expect(summary.totals.organizations).toBe(2);
    expect(summary.totals.units).toBe(4);
    expect(summary.totals.stores).toBe(2);
    expect(summary.totals.products).toBe(2);
    expect(summary.summaryFilePath).toBeUndefined();
    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();

    const organizationUnitCalls = prisma.organizationUnit.upsert.mock.calls.map(
      ([args]) => args,
    );
    expect(organizationUnitCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 1 }),
        }),
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 2 }),
        }),
      ]),
    );

    const storeCalls = prisma.store.upsert.mock.calls.map(([args]) => args);
    expect(storeCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 1 }),
          update: expect.objectContaining({ organizationId: 1 }),
        }),
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 2 }),
          update: expect.objectContaining({ organizationId: 2 }),
        }),
      ]),
    );

    const providerCalls = prisma.provider.upsert.mock.calls.map(
      ([args]) => args,
    );
    expect(providerCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 1 }),
          update: expect.objectContaining({ organizationId: 1 }),
        }),
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 2 }),
          update: expect.objectContaining({ organizationId: 2 }),
        }),
      ]),
    );

    const membershipCalls = prisma.organizationMembership.upsert.mock.calls.map(
      ([args]) => args,
    );
    expect(membershipCalls.length).toBeGreaterThan(0);
    for (const call of membershipCalls) {
      const { where, create } = call;
      const compositeKey = where.userId_organizationId_organizationUnitId;
      expect(compositeKey.organizationId).toBeDefined();
      expect(create.organizationId).toBe(compositeKey.organizationId);
      expect(create.organizationUnitId).toBe(compositeKey.organizationUnitId);
    }

    const membershipOrganizationIds = membershipCalls.map(
      ({ where }) =>
        where.userId_organizationId_organizationUnitId.organizationId,
    );
    expect(membershipOrganizationIds).toEqual(expect.arrayContaining([1, 2]));

    const clientCalls = prisma.client.upsert.mock.calls.map(([args]) => args);
    expect(clientCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 1 }),
          update: expect.objectContaining({ organizationId: 1 }),
        }),
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 2 }),
          update: expect.objectContaining({ organizationId: 2 }),
        }),
      ]),
    );

    const userCalls = prisma.user.upsert.mock.calls.map(([args]) => args);
    expect(userCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          update: expect.objectContaining({ organizationId: 1 }),
          create: expect.objectContaining({ organizationId: 1 }),
        }),
        expect.objectContaining({
          update: expect.objectContaining({ organizationId: 2 }),
          create: expect.objectContaining({ organizationId: 2 }),
        }),
      ]),
    );

    const inventoryCalls = prisma.inventory.upsert.mock.calls.map(
      ([args]) => args,
    );
    expect(inventoryCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          update: expect.objectContaining({ organizationId: 1 }),
          create: expect.objectContaining({ organizationId: 1 }),
        }),
        expect.objectContaining({
          update: expect.objectContaining({ organizationId: 2 }),
          create: expect.objectContaining({ organizationId: 2 }),
        }),
      ]),
    );

    const inventoryHistoryCalls = prisma.inventoryHistory.create.mock.calls;
    expect(inventoryHistoryCalls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              organizationId: 1,
              action: 'seed-fixture',
            }),
          }),
        ]),
        expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              organizationId: 2,
              action: 'seed-fixture',
            }),
          }),
        ]),
      ]),
    );

    expect(logger).toHaveBeenCalledWith(
      'Multi-tenant fixtures ensured for 2 organization(s).',
    );
    expect(logger).toHaveBeenCalledWith(
      'Fixture applied for organization tenant-alpha',
    );
    expect(logger).toHaveBeenCalledWith(
      'Fixture applied for organization tenant-beta',
    );
    expect(prisma.$disconnect).not.toHaveBeenCalled();
  });

  it('persists a summary file when summaryPath is provided', async () => {
    const prisma = buildMockPrisma();
    const logger = jest.fn();

    const summary = await applyMultiTenantFixtures({
      prisma: prisma as unknown as PrismaClient,
      logger,
      summaryPath: './tmp/fixtures-summary.json',
    });

    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('./tmp'), {
      recursive: true,
    });
    expect(writeFile).toHaveBeenCalledWith(
      './tmp/fixtures-summary.json',
      expect.stringContaining('tenant-alpha'),
      'utf8',
    );
    expect(summary.summaryFilePath).toBe('./tmp/fixtures-summary.json');
  });

  it('allows restricting fixtures to a subset of organizations', async () => {
    const prisma = buildMockPrisma();
    const logger = jest.fn();

    const summary = await applyMultiTenantFixtures({
      prisma: prisma as unknown as PrismaClient,
      logger,
      onlyOrganizations: ['tenant-alpha'],
    });

    expect(summary.totals.organizations).toBe(1);
    expect(summary.organizations.map((item) => item.code)).toEqual([
      'tenant-alpha',
    ]);

    const organizationCalls = prisma.organization.upsert.mock.calls.map(
      ([args]) => args,
    );
    expect(organizationCalls).toHaveLength(1);
    expect(organizationCalls[0].where.code).toBe('tenant-alpha');

    expect(logger).toHaveBeenCalledWith(
      'Multi-tenant fixtures ensured for 1 organization(s).',
    );
    expect(logger).toHaveBeenCalledWith(
      'Fixture applied for organization tenant-alpha',
    );
    expect(logger).not.toHaveBeenCalledWith(
      'Fixture applied for organization tenant-beta',
    );
  });

  it('skips organizations listed in skipOrganizations', async () => {
    const prisma = buildMockPrisma();
    const logger = jest.fn();

    const summary = await applyMultiTenantFixtures({
      prisma: prisma as unknown as PrismaClient,
      logger,
      skipOrganizations: ['tenant-beta'],
    });

    expect(summary.totals.organizations).toBe(1);
    expect(summary.organizations.map((item) => item.code)).toEqual([
      'tenant-alpha',
    ]);
    expect(logger).toHaveBeenCalledWith(
      'Multi-tenant fixtures ensured for 1 organization(s).',
    );
  });

  it('throws when filtering with an unknown organization code', async () => {
    const prisma = buildMockPrisma();

    await expect(
      applyMultiTenantFixtures({
        prisma: prisma as unknown as PrismaClient,
        onlyOrganizations: ['tenant-gamma'],
      }),
    ).rejects.toThrow(/Unknown organization code/);
  });

  it('returns an empty summary when filters exclude all organizations', async () => {
    const prisma = buildMockPrisma();
    const logger = jest.fn();

    const summary = await applyMultiTenantFixtures({
      prisma: prisma as unknown as PrismaClient,
      logger,
      skipOrganizations: ['tenant-alpha', 'tenant-beta'],
    });

    expect(summary.totals.organizations).toBe(0);
    expect(summary.organizations).toEqual([]);
    expect(logger).toHaveBeenCalledWith(
      '[multi-tenant-seed] No organizations matched the provided filters.',
    );
  });
});
