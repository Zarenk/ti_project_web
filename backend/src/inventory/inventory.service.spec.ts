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
    create: jest.Mock;
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
  };
  entryDetailSeries: {
    findFirst: jest.Mock;
    create: jest.Mock;
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
        create: jest.fn(),
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
      },
      entryDetailSeries: {
        findFirst: jest.fn(),
        create: jest.fn(),
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
    prisma.user.findUnique.mockResolvedValue({ username: 'user@example.com' });
    prisma.store.findUnique.mockImplementation(async ({ where: { id } }) => ({
      id,
      organizationId: 777,
    }));
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue({ id: 303, name: 'Category' });
    prisma.provider.findFirst.mockResolvedValue(null);
    prisma.provider.create.mockResolvedValue({ id: 404, name: 'Provider' });
    prisma.tipoCambio.findFirst.mockResolvedValue(null);
    prisma.inventory.create.mockResolvedValue({ id: 202, productId: 101 });
    prisma.storeOnInventory.create.mockResolvedValue({ id: 303, stock: 0 });
    prisma.entry.create.mockResolvedValue({ id: 505 });
    prisma.entryDetail.create.mockResolvedValue({ id: 606 });
    prisma.entryDetailSeries.findFirst.mockResolvedValue(null);
    prisma.entryDetailSeries.create.mockResolvedValue({ id: 707 });

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
      organizationId: 777,
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
});