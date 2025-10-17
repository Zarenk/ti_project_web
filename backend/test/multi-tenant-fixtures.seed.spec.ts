import type { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $disconnect: jest.fn(async () => undefined),
  })),
  UserRole: {
    ADMIN: 'ADMIN',
    CLIENT: 'CLIENT',
    SELLER: 'SELLER',
    SUPER_ADMIN: 'SUPER_ADMIN',
    CASHIER: 'CASHIER',
  },
  OrganizationMembershipRole: {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER',
    VIEWER: 'VIEWER',
  },
}));

import { applyMultiTenantFixtures } from '../prisma/seed/multi-tenant-fixtures.seed';

type AsyncMock<T = unknown> = jest.Mock<Promise<T>, any[]>;

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
      upsert: jest.fn(async ({ where: { name } }) => ({ id: categoryIds.get(name) ?? 9999 })),
    },
    organization: {
      upsert: jest.fn(async ({ where: { code } }) => ({ id: organizationIds.get(code) ?? 0 })),
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

describe('applyMultiTenantFixtures', () => {
  it('propagates organizationId across multi-tenant fixtures', async () => {
    const prisma = buildMockPrisma();
    const logger = jest.fn();

    await applyMultiTenantFixtures({ prisma: prisma as unknown as PrismaClient, logger });

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

    const providerCalls = prisma.provider.upsert.mock.calls.map(([args]) => args);
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

    const inventoryCalls = prisma.inventory.upsert.mock.calls.map(([args]) => args);
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
            data: expect.objectContaining({ organizationId: 1, action: 'seed-fixture' }),
          }),
        ]),
        expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({ organizationId: 2, action: 'seed-fixture' }),
          }),
        ]),
      ]),
    );

    expect(logger).toHaveBeenCalledWith('Multi-tenant fixtures ensured.');
    expect(prisma.$disconnect).not.toHaveBeenCalled();
  });
});