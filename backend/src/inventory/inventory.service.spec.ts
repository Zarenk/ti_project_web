jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

type InventoryPrismaMock = {
  product: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  storeOnInventory: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
  };
  inventory: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
  };
  transfer: {
    create: jest.Mock;
  };
  inventoryHistory: {
    createMany: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
  store: {
    findUnique: jest.Mock;
  };
  category: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  provider: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  tipoCambio: {
    findFirst: jest.Mock;
  };
  entry: {
    create: jest.Mock;
  };
  entryDetail: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
  entryDetailSeries: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  salesDetail: {
    findMany: jest.Mock;
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
      product: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
      storeOnInventory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      inventory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      transfer: {
        create: jest.fn(),
      },
      inventoryHistory: {
        createMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      store: {
        findUnique: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      provider: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      tipoCambio: {
        findFirst: jest.fn(),
      },
      entry: {
        create: jest.fn(),
      },
      entryDetail: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      entryDetailSeries: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      salesDetail: {
        findMany: jest.fn(),
      },
    };

    activityService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    accountingHook = {
      postInventoryAdjustment: jest.fn().mockResolvedValue(undefined),
    };

    service = new InventoryService(
      prisma as unknown as PrismaService,
      activityService as unknown as ActivityService,
      accountingHook as AccountingHook,
    );

    prisma.product.findUnique.mockResolvedValue({ name: 'Widget' });
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue({ id: 101, name: 'Widget' });
    prisma.transfer.create.mockResolvedValue({ id: 1 });
    prisma.inventoryHistory.createMany.mockResolvedValue({ count: 2 });
    prisma.inventoryHistory.create.mockResolvedValue({ id: 900 });
    prisma.inventoryHistory.findMany.mockResolvedValue([]);
    prisma.user.findUnique.mockResolvedValue({ username: 'user@example.com' });
    prisma.store.findUnique.mockImplementation(async ({ where: { id } }) => ({
      id,
      organizationId: 321,
    }));
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue({ id: 303, name: 'Category' });
    prisma.provider.findFirst.mockResolvedValue(null);
    prisma.provider.create.mockResolvedValue({ id: 404, name: 'Provider' });
    prisma.tipoCambio.findFirst.mockResolvedValue(null);
    prisma.inventory.create.mockResolvedValue({ id: 202, productId: 101 });
    prisma.inventory.findMany.mockResolvedValue([]);
    prisma.storeOnInventory.create.mockResolvedValue({ id: 303, stock: 0 });
    prisma.storeOnInventory.findMany.mockResolvedValue([]);
    prisma.entry.create.mockResolvedValue({ id: 505 });
    prisma.entryDetail.create.mockResolvedValue({ id: 606 });
    prisma.entryDetail.findMany.mockResolvedValue([]);
    prisma.entryDetailSeries.findFirst.mockResolvedValue(null);
    prisma.entryDetailSeries.create.mockResolvedValue({ id: 707 });
    prisma.salesDetail.findMany.mockResolvedValue([]);

    logOrganizationContextMock =
      logOrganizationContext as unknown as jest.Mock;
    logOrganizationContextMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('propagates organizationId when transferring inventory with an explicit tenant', async () => {
    prisma.store.findUnique.mockImplementation(async ({ where: { id } }) => ({
      id,
      organizationId: 321,
    }));
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
    prisma.store.findUnique.mockImplementation(async ({ where: { id } }) => ({
      id,
      organizationId: null,
    }));
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

  it('throws when source and destination stores belong to different organizations', async () => {
    prisma.store.findUnique.mockImplementation(async ({ where: { id } }) => ({
      id,
      organizationId: id === 1 ? 101 : 202,
    }));

    prisma.storeOnInventory.findFirst.mockResolvedValue({ id: 50, stock: 10, inventoryId: 80 });

    await expect(
      service.transferProduct({
        sourceStoreId: 1,
        destinationStoreId: 2,
        productId: 3,
        quantity: 1,
        userId: 4,
        organizationId: 101,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.transfer.create).not.toHaveBeenCalled();
  });

  it('filters inventory history by organization when provided', async () => {
    prisma.inventoryHistory.findMany.mockClear();
    logOrganizationContextMock.mockClear();

    await service.findAllInventoryHistory(42);

    expect(prisma.inventoryHistory.findMany).toHaveBeenCalled();
    const args = prisma.inventoryHistory.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ organizationId: 42 });
    expect(logOrganizationContextMock).toHaveBeenCalledWith({
      service: InventoryService.name,
      operation: 'findAllInventoryHistory',
      organizationId: 42,
      metadata: { scope: 'inventoryHistory' },
    });
  });

  it('filters purchase prices by organization when provided', async () => {
    prisma.entryDetail.findMany.mockClear();
    logOrganizationContextMock.mockClear();

    await service.getAllPurchasePrices(15);

    expect(prisma.entryDetail.findMany).toHaveBeenCalled();
    const args = prisma.entryDetail.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ entry: { organizationId: 15 } });
    expect(logOrganizationContextMock).toHaveBeenCalledWith({
      service: InventoryService.name,
      operation: 'getAllPurchasePrices',
      organizationId: 15,
      metadata: { scope: 'purchasePrices' },
    });
  });

  it('logs inventory history lookup for a user without explicit tenant', async () => {
    prisma.inventoryHistory.findMany.mockClear();
    logOrganizationContextMock.mockClear();

    await service.findAllHistoryByUser(7);

    expect(prisma.inventoryHistory.findMany).toHaveBeenCalled();
    const args = prisma.inventoryHistory.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 7 });
    expect(logOrganizationContextMock).toHaveBeenCalledWith({
      service: InventoryService.name,
      operation: 'findAllHistoryByUser',
      organizationId: null,
      metadata: { userId: 7 },
    });
  });

  describe('processExcelData multi-organization support', () => {
    const excelRows = [
      {
        nombre: 'Laptop X',
        categoria: 'Laptops',
        descripcion: 'High end laptop',
        precioCompra: '1500',
        precioVenta: '2000',
        stock: '3',
      },
    ];

    beforeEach(() => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({ id: 20, name: 'Laptops' });
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({
        id: 30,
        name: 'Laptop X',
      });
      prisma.inventory.findFirst.mockResolvedValue(null);
      prisma.inventory.create.mockResolvedValue({ id: 40, productId: 30 });
      prisma.storeOnInventory.findFirst.mockResolvedValue(null);
      prisma.storeOnInventory.create.mockResolvedValue({ id: 50, stock: 0 });
      prisma.inventoryHistory.create.mockResolvedValue({ id: 60 });
      prisma.entry.create.mockResolvedValue({ id: 70 });
      prisma.entryDetail.create.mockResolvedValue({ id: 80 });
      prisma.tipoCambio.findFirst.mockResolvedValue(null);
      activityService.log.mockClear();
      logOrganizationContextMock.mockClear();
    });

    it('propagates an explicit organizationId across inventory and accounting artifacts', async () => {
      prisma.store.findUnique.mockImplementation(async ({ where: { id } }) => ({
        id,
        organizationId: 555,
      }));

      await service.processExcelData(excelRows, 1, 10, 2, 999);

      expect(prisma.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 999 }),
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 999 }),
        }),
      );
      expect(prisma.entry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 999 }),
        }),
      );
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          service: InventoryService.name,
          operation: 'processExcelData',
          organizationId: 999,
        }),
      );
    });

    it('falls back to the store organizationId when no explicit tenant is provided', async () => {
      prisma.store.findUnique.mockImplementation(async ({ where: { id } }) => ({
        id,
        organizationId: 444,
      }));

      await service.processExcelData(excelRows, 5, 11, 3);

      expect(prisma.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 444 }),
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 444 }),
        }),
      );
      expect(prisma.entry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 444 }),
        }),
      );
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 444,
        }),
      );
    });
  });

  it('filters getInventoryWithEntries by organization when provided', async () => {
    prisma.inventory.findMany.mockResolvedValueOnce([]);

    await service.getInventoryWithEntries(987);

    expect(prisma.inventory.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { organizationId: 987 },
      }),
    );

    prisma.inventory.findMany.mockResolvedValueOnce([]);

    await service.getInventoryWithEntries(null);

    expect(prisma.inventory.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { organizationId: null },
      }),
    );
  });

  it('filters store products by organization when provided', async () => {
    prisma.storeOnInventory.findMany.mockResolvedValue([]);

    await service.getProductsByStore(99, undefined, undefined, 55);

    expect(prisma.storeOnInventory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          storeId: 99,
          store: { organizationId: 55 },
          inventory: expect.objectContaining({ organizationId: 55 }),
        }),
      }),
    );
  });

  it('filters product entries by organization when provided', async () => {
    prisma.entryDetail.findMany.mockResolvedValue([]);

    await service.getProductEntries(44, 12);

    expect(prisma.entryDetail.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: 44,
          entry: expect.objectContaining({ organizationId: 12 }),
        }),
      }),
    );
  });

  it('filters inventory lookup by organization when requesting a product by inventory id', async () => {
    prisma.inventory.findFirst.mockResolvedValue({
      product: { id: 1, name: 'Widget' },
    });

    await service.getProductByInventoryId(200, 77);

    expect(prisma.inventory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 200,
          organizationId: 77,
        }),
      }),
    );
  });

  it('filters product sales by organization when provided', async () => {
    prisma.salesDetail.findMany.mockResolvedValue([]);

    await service.getProductSales(42, 88);

    expect(prisma.salesDetail.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: 42,
          sale: expect.objectContaining({ organizationId: 88 }),
        }),
      }),
    );
  });
  
});