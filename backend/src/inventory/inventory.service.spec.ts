jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

import { InventoryService } from './inventory.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

type InventoryPrismaMock = {
  product: { findUnique: jest.Mock };
  storeOnInventory: {
    findFirst: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  inventory: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  transfer: {
    create: jest.Mock;
  };
  inventoryHistory: {
    createMany: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
};

describe('InventoryService multi-organization support', () => {
  let prisma: InventoryPrismaMock;
  let activityService: { log: jest.Mock };
  let accountingHook: Partial<AccountingHook>;
  let service: InventoryService;
  let logOrganizationContextMock: jest.Mock;

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn() },
      storeOnInventory: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      inventory: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      transfer: {
        create: jest.fn(),
      },
      inventoryHistory: {
        createMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    activityService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    accountingHook = {};

    service = new InventoryService(
      prisma as unknown as PrismaService,
      activityService as unknown as ActivityService,
      accountingHook as AccountingHook,
    );

    prisma.product.findUnique.mockResolvedValue({ name: 'Widget' });
    prisma.transfer.create.mockResolvedValue({ id: 1 });
    prisma.inventoryHistory.createMany.mockResolvedValue({ count: 2 });
    prisma.user.findUnique.mockResolvedValue({ username: 'user@example.com' });

    logOrganizationContextMock =
      logOrganizationContext as unknown as jest.Mock;
    logOrganizationContextMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('propagates organizationId when transferring inventory with an explicit tenant', async () => {
    prisma.storeOnInventory.findFirst
      .mockResolvedValueOnce({ id: 10, stock: 20, inventoryId: 50 })
      .mockResolvedValueOnce(null);
    prisma.storeOnInventory.update.mockResolvedValue({});
    prisma.storeOnInventory.create.mockResolvedValue({ id: 90 });
    prisma.inventory.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 300 });
    prisma.inventory.create.mockResolvedValue({ id: 300 });

    const result = await service.transferProduct({
      sourceStoreId: 1,
      destinationStoreId: 2,
      productId: 3,
      quantity: 4,
      userId: 5,
      description: 'Restock',
      organizationId: 321,
    });

    expect(result).toEqual({ message: 'Traslado realizado con éxito' });
    expect(prisma.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 321 }),
      }),
    );
    expect(prisma.transfer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 321 }),
      }),
    );

    const historyPayload =
      prisma.inventoryHistory.createMany.mock.calls[0][0].data;
    expect(historyPayload).toHaveLength(2);
    (historyPayload as Array<{ organizationId: number | null }>).forEach(
      (entry) => expect(entry.organizationId).toBe(321),
    );

    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        service: InventoryService.name,
        operation: 'transferProduct',
        organizationId: 321,
      }),
    );
  });

  it('defaults organizationId to null when tenant context is missing', async () => {
    prisma.storeOnInventory.findFirst
      .mockResolvedValueOnce({ id: 11, stock: 15, inventoryId: 55 })
      .mockResolvedValueOnce({ id: 22, stock: 5, inventoryId: 66 });
    prisma.storeOnInventory.update.mockResolvedValue({});

    const result = await service.transferProduct({
      sourceStoreId: 1,
      destinationStoreId: 3,
      productId: 4,
      quantity: 5,
      userId: 6,
    });

    expect(result).toEqual({ message: 'Traslado realizado con éxito' });
    expect(prisma.inventory.create).not.toHaveBeenCalled();
    expect(prisma.transfer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );

    const historyPayload =
      prisma.inventoryHistory.createMany.mock.calls[0][0].data;
    (historyPayload as Array<{ organizationId: number | null }>).forEach(
      (entry) => expect(entry.organizationId).toBeNull(),
    );

    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        service: InventoryService.name,
        operation: 'transferProduct',
        organizationId: null,
      }),
    );
  });
});