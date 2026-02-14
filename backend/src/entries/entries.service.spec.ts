jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { AccountingService } from 'src/accounting/accounting.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import { TenantContextService } from 'src/tenancy/tenant-context.service';

interface PrismaMock {
  store: { findUnique: jest.Mock };
  provider: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  product: { findUnique: jest.Mock; findMany: jest.Mock };
  entry: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    delete: jest.Mock;
  };
  entryDetail: { update: jest.Mock };
  salesDetail: { count: jest.Mock };
  entryDetailSeries: { createMany: jest.Mock; deleteMany: jest.Mock };
  inventory: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
  storeOnInventory: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  inventoryHistory: { create: jest.Mock };
  shippingGuide: { updateMany: jest.Mock };
  invoice: { create: jest.Mock };
  $transaction: jest.Mock;
}

const createPrismaMock = (): PrismaMock => ({
  store: { findUnique: jest.fn() },
  provider: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  product: { findUnique: jest.fn(), findMany: jest.fn() },
  entry: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
  entryDetail: { update: jest.fn() },
  salesDetail: { count: jest.fn() },
  entryDetailSeries: { createMany: jest.fn(), deleteMany: jest.fn() },
  inventory: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  storeOnInventory: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  inventoryHistory: { create: jest.fn() },
  shippingGuide: { updateMany: jest.fn() },
  invoice: { create: jest.fn() },
  $transaction: jest.fn(),
});

describe('EntriesService multi-organization support', () => {
  let prisma: PrismaMock;
  let activityService: { log: jest.Mock };
  let accountingHook: { postPurchase: jest.Mock };
  let accountingService: { createJournalForInventoryEntry: jest.Mock };
  let service: EntriesService;
  let logOrganizationContextMock: jest.Mock;
  let tenantContextService: { getContext: jest.Mock };

  const baseInput = {
    storeId: 10,
    userId: 20,
    providerId: 30,
    date: new Date('2024-01-01'),
    description: 'Bulk purchase',
    tipoMoneda: 'PEN',
    paymentMethod: 'CASH' as const,
    paymentTerm: 'CASH' as const,
    details: [
      {
        productId: 99,
        name: 'Widget',
        quantity: 5,
        price: 100,
        priceInSoles: 100,
      },
    ],
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(
      async (cb: (tx: PrismaMock) => Promise<any>) => cb(prisma),
    );

    prisma.store.findUnique.mockResolvedValue({
      id: baseInput.storeId,
      organizationId: 777,
    });
    prisma.provider.findUnique.mockResolvedValue({ id: baseInput.providerId });
    prisma.user.findUnique.mockResolvedValue({ id: baseInput.userId });
    prisma.product.findUnique.mockResolvedValue({
      id: baseInput.details[0].productId,
      name: 'Widget',
    });
    prisma.product.findMany.mockResolvedValue([
      { id: baseInput.details[0].productId, name: 'Widget' },
    ]);
    prisma.entry.create.mockResolvedValue({
      id: 555,
      details: [{ id: 888, productId: baseInput.details[0].productId }],
      storeId: baseInput.storeId,
      userId: baseInput.userId,
      providerId: baseInput.providerId,
    });
    prisma.entry.findMany.mockResolvedValue([]);
    prisma.entry.findFirst.mockResolvedValue(null);
    prisma.entryDetail.update.mockResolvedValue(undefined);
    prisma.salesDetail.count.mockResolvedValue(0);
    prisma.inventory.findFirst.mockResolvedValue(null);
    prisma.inventory.findMany.mockResolvedValue([]);
    prisma.inventory.create.mockResolvedValue({ id: 444 });
    prisma.storeOnInventory.findFirst.mockResolvedValue(null);
    prisma.storeOnInventory.findMany.mockResolvedValue([]);
    prisma.storeOnInventory.create.mockResolvedValue({
      id: 333,
      stock: baseInput.details[0].quantity,
    });
    prisma.storeOnInventory.update.mockResolvedValue(undefined);
    prisma.inventoryHistory.create.mockResolvedValue(undefined);
    prisma.shippingGuide.updateMany.mockResolvedValue({ count: 0 });
    prisma.entryDetailSeries.createMany.mockResolvedValue(undefined);
    prisma.entry.findUnique.mockResolvedValue(null);
    prisma.entry.delete.mockResolvedValue(undefined);
    prisma.entryDetailSeries.deleteMany.mockResolvedValue(undefined);
    prisma.invoice.create.mockResolvedValue(undefined);

    activityService = { log: jest.fn().mockResolvedValue(undefined) };
    accountingHook = { postPurchase: jest.fn().mockResolvedValue(undefined) };
    accountingService = {
      createJournalForInventoryEntry: jest.fn().mockResolvedValue(undefined),
    };
    tenantContextService = {
      getContext: jest.fn(() => ({
        organizationId: null,
        companyId: null,
        organizationUnitId: null,
        userId: null,
        isGlobalSuperAdmin: false,
        isOrganizationSuperAdmin: false,
        isSuperAdmin: false,
        allowedOrganizationIds: [],
        allowedCompanyIds: [],
        allowedOrganizationUnitIds: [],
      })),
    };

    service = new EntriesService(
      prisma as unknown as PrismaService,
      {} as any,
      activityService as unknown as ActivityService,
      accountingHook as unknown as AccountingHook,
      accountingService as unknown as AccountingService,
      tenantContextService as unknown as TenantContextService,
    );

    logOrganizationContextMock = logOrganizationContext as unknown as jest.Mock;
    logOrganizationContextMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('propagates organizationId when provided explicitly', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: baseInput.storeId,
      organizationId: 321,
    });
    await service.createEntry({ ...baseInput, organizationId: 321 });

    expect(prisma.entry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 321 }),
      }),
    );
    expect(prisma.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 321 }),
      }),
    );

    const historyCall = prisma.inventoryHistory.create.mock.calls[0][0];
    expect(historyCall.data.organizationId).toBe(321);

    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        service: EntriesService.name,
        operation: 'createEntry',
        organizationId: 321,
      }),
    );
    expect(
      accountingService.createJournalForInventoryEntry,
    ).toHaveBeenCalledWith(
      expect.any(Number),
      tenantContextService.getContext.mock.results[0].value,
    );
  });

  it('falls back to the store organizationId when not provided', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: baseInput.storeId,
      organizationId: 654,
    });

    await service.createEntry(baseInput);

    expect(prisma.entry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 654 }),
      }),
    );
    expect(prisma.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 654 }),
      }),
    );

    const historyCall = prisma.inventoryHistory.create.mock.calls[0][0];
    expect(historyCall.data.organizationId).toBe(654);

    expect(
      logOrganizationContextMock.mock.calls.some(
        ([payload]) =>
          payload.operation === 'createEntry' && payload.organizationId === 654,
      ),
    ).toBe(true);
  });

  it('throws when the provided tenant differs from the store organization', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: baseInput.storeId,
      organizationId: 987,
    });

    await expect(
      service.createEntry({ ...baseInput, organizationId: 555 }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.entry.create).not.toHaveBeenCalled();
    expect(prisma.inventory.create).not.toHaveBeenCalled();
  });

  it('defaults organizationId to null when neither payload nor store defines it', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: baseInput.storeId,
      organizationId: null,
    });

    await service.createEntry(baseInput);

    expect(prisma.entry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );
    expect(prisma.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );

    const historyCall = prisma.inventoryHistory.create.mock.calls[0][0];
    expect(historyCall.data.organizationId).toBeNull();

    expect(
      logOrganizationContextMock.mock.calls.some(
        ([payload]) =>
          payload.operation === 'createEntry' &&
          payload.organizationId === null,
      ),
    ).toBe(true);
  });
  it('uses the tenant context when provided and the payload omits organizationId', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: baseInput.storeId,
      organizationId: null,
    });

    await service.createEntry(baseInput, 4321);

    expect(prisma.entry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 4321 }),
      }),
    );
    expect(prisma.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 4321 }),
      }),
    );
    expect(
      logOrganizationContextMock.mock.calls.some(
        ([payload]) =>
          payload.operation === 'createEntry' &&
          payload.organizationId === 4321,
      ),
    ).toBe(true);
  });

  it('throws when the tenant context mismatches the resolved organization', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: baseInput.storeId,
      organizationId: 888,
    });

    await expect(service.createEntry(baseInput, 999)).rejects.toThrow(
      BadRequestException,
    );

    expect(prisma.entry.create).not.toHaveBeenCalled();
    expect(prisma.inventory.create).not.toHaveBeenCalled();
  });

  describe('findAllEntries', () => {
    const entryTemplate = {
      id: 1,
      organizationId: 77,
      details: [
        {
          id: 200,
          product: { name: 'Widget' },
          series: [{ serial: 'S-1' }, { serial: 'S-2' }],
        },
      ],
      provider: { id: 300 },
      user: { id: 400 },
      store: { id: 500 },
    };

    it('lists entries without filtering when organizationId is undefined (legacy scope)', async () => {
      prisma.entry.findMany.mockResolvedValue([entryTemplate]);

      const result = await service.findAllEntries();

      expect(prisma.entry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: null } }),
      );
      expect(result[0].details[0].series).toEqual(['S-1', 'S-2']);
      expect(result[0].details[0].product_name).toBe('Widget');
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'findAllEntries',
          organizationId: null,
        }),
      );
    });

    it('applies organization filters when provided', async () => {
      prisma.entry.findMany.mockResolvedValue([
        { ...entryTemplate, organizationId: 123 },
      ]);

      await service.findAllEntries(123);

      expect(prisma.entry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 123 } }),
      );
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'findAllEntries',
          organizationId: 123,
        }),
      );
    });

    it('includes legacy rows when organizationId is null', async () => {
      prisma.entry.findMany.mockResolvedValue([
        { ...entryTemplate, organizationId: null },
      ]);

      await service.findAllEntries(null);

      expect(prisma.entry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: null } }),
      );
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'findAllEntries',
          organizationId: null,
        }),
      );
    });
  });

  describe('findEntryById', () => {
    const baseEntry = {
      id: 900,
      organizationId: 321,
      details: [
        {
          id: 901,
          product: { name: 'Widget' },
          series: [{ serial: 'AA' }],
        },
      ],
      provider: { id: 88 },
      user: { id: 77 },
      store: { id: 66 },
    };

    it('fetches entry constrained to the provided organizationId', async () => {
      prisma.entry.findFirst.mockResolvedValue(baseEntry);

      const result = await service.findEntryById(900, 321);

      expect(prisma.entry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 900, organizationId: 321 } }),
      );
      expect(result.details[0].series).toEqual(['AA']);
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'findEntryById',
          organizationId: 321,
          metadata: { entryId: 900 },
        }),
      );
    });

    it('returns legacy entries when organizationId is null', async () => {
      prisma.entry.findFirst.mockResolvedValue({
        ...baseEntry,
        organizationId: null,
      });

      await service.findEntryById(900, null);

      expect(prisma.entry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 900, organizationId: null } }),
      );
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'findEntryById',
          organizationId: null,
          metadata: { entryId: 900 },
        }),
      );
    });

    it('throws NotFoundException when no entry matches the tenant filter', async () => {
      prisma.entry.findFirst.mockResolvedValue(null);

      await expect(service.findEntryById(123, 999)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.entry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 123, organizationId: 999 } }),
      );
    });
  });

  describe('deleteEntry', () => {
    const entryBase = {
      id: 999,
      storeId: 10,
      userId: 20,
      details: [
        {
          id: 1001,
          productId: 99,
          quantity: 2,
          product: { name: 'Widget' },
          series: [{ serial: 'A1' }],
        },
      ],
    };

    beforeEach(() => {
      prisma.storeOnInventory.findFirst.mockResolvedValue({
        id: 222,
        stock: 10,
        inventoryId: 333,
      });
      prisma.entry.delete.mockResolvedValue({ id: entryBase.id });
    });

    it('propagates organizationId to inventory history and logging when present', async () => {
      prisma.entry.findFirst.mockResolvedValue({
        ...entryBase,
        organizationId: 55,
      });

      await service.deleteEntry(entryBase.id, 55);

      expect(prisma.entryDetailSeries.deleteMany).toHaveBeenCalledWith({
        where: { entryDetailId: entryBase.details[0].id },
      });
      expect(prisma.storeOnInventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 222 },
          data: { stock: { decrement: entryBase.details[0].quantity } },
        }),
      );
      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: 55 }),
      });
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'deleteEntry',
          organizationId: 55,
        }),
      );
      expect(prisma.entry.delete).toHaveBeenCalledWith({
        where: { id: entryBase.id },
      });
    });

    it('defaults organizationId to null during deletion when entry is legacy', async () => {
      prisma.entry.findFirst.mockResolvedValue({
        ...entryBase,
        organizationId: null,
      });

      await service.deleteEntry(entryBase.id, null);

      expect(prisma.inventoryHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: null }),
      });
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'deleteEntry',
          organizationId: null,
        }),
      );
    });
  });
});
