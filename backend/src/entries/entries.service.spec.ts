jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

import { BadRequestException } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { AccountingService } from 'src/accounting/accounting.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

interface PrismaMock {
  store: { findUnique: jest.Mock };
  provider: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  product: { findUnique: jest.Mock };
  entry: { create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
  entryDetail: { update: jest.Mock };
  entryDetailSeries: { createMany: jest.Mock; deleteMany: jest.Mock };
  inventory: { findFirst: jest.Mock; create: jest.Mock };
  storeOnInventory: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  inventoryHistory: { create: jest.Mock };
  invoice: { create: jest.Mock };
  $transaction: jest.Mock;
}

const createPrismaMock = (): PrismaMock => ({
  store: { findUnique: jest.fn() },
  provider: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  product: { findUnique: jest.fn() },
  entry: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
  entryDetail: { update: jest.fn() },
  entryDetailSeries: { createMany: jest.fn(), deleteMany: jest.fn() },
  inventory: { findFirst: jest.fn(), create: jest.fn() },
  storeOnInventory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  inventoryHistory: { create: jest.fn() },
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
      { productId: 99, name: 'Widget', quantity: 5, price: 100, priceInSoles: 100 },
    ],
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (cb: (tx: PrismaMock) => Promise<any>) =>
      cb(prisma),
    );

    prisma.store.findUnique.mockResolvedValue({ id: baseInput.storeId, organizationId: 777 });
    prisma.provider.findUnique.mockResolvedValue({ id: baseInput.providerId });
    prisma.user.findUnique.mockResolvedValue({ id: baseInput.userId });
    prisma.product.findUnique.mockResolvedValue({ id: baseInput.details[0].productId, name: 'Widget' });
    prisma.entry.create.mockResolvedValue({
      id: 555,
      details: [{ id: 888, productId: baseInput.details[0].productId }],
      storeId: baseInput.storeId,
      userId: baseInput.userId,
      providerId: baseInput.providerId,
    });
    prisma.entryDetail.update.mockResolvedValue(undefined);
    prisma.inventory.findFirst.mockResolvedValue(null);
    prisma.inventory.create.mockResolvedValue({ id: 444 });
    prisma.storeOnInventory.findFirst.mockResolvedValue(null);
    prisma.storeOnInventory.create.mockResolvedValue({ id: 333, stock: baseInput.details[0].quantity });
    prisma.storeOnInventory.update.mockResolvedValue(undefined);
    prisma.inventoryHistory.create.mockResolvedValue(undefined);
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

    service = new EntriesService(
      prisma as unknown as PrismaService,
      {} as any,
      activityService as unknown as ActivityService,
      accountingHook as unknown as AccountingHook,
      accountingService as unknown as AccountingService,
    );

    logOrganizationContextMock = logOrganizationContext as unknown as jest.Mock;
    logOrganizationContextMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('propagates organizationId when provided explicitly', async () => {
    prisma.store.findUnique.mockResolvedValue({ id: baseInput.storeId, organizationId: 321 });
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
  });

  it('falls back to the store organizationId when not provided', async () => {
    prisma.store.findUnique.mockResolvedValue({ id: baseInput.storeId, organizationId: 654 });

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
      logOrganizationContextMock.mock.calls.some(([payload]) =>
        payload.operation === 'createEntry' && payload.organizationId === 654,
      ),
    ).toBe(true);
  });

  it('throws when the provided tenant differs from the store organization', async () => {
    prisma.store.findUnique.mockResolvedValue({ id: baseInput.storeId, organizationId: 987 });

    await expect(
      service.createEntry({ ...baseInput, organizationId: 555 }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.entry.create).not.toHaveBeenCalled();
    expect(prisma.inventory.create).not.toHaveBeenCalled();
  });

  it('defaults organizationId to null when neither payload nor store defines it', async () => {
    prisma.store.findUnique.mockResolvedValue({ id: baseInput.storeId, organizationId: null });

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
      logOrganizationContextMock.mock.calls.some(([payload]) =>
        payload.operation === 'createEntry' && payload.organizationId === null,
      ),
    ).toBe(true);
  });
  it('uses the tenant context when provided and the payload omits organizationId', async () => {
    prisma.store.findUnique.mockResolvedValue({ id: baseInput.storeId, organizationId: null });

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
      logOrganizationContextMock.mock.calls.some(([payload]) =>
        payload.operation === 'createEntry' && payload.organizationId === 4321,
      ),
    ).toBe(true);
  });

  it('throws when the tenant context mismatches the resolved organization', async () => {
    prisma.store.findUnique.mockResolvedValue({ id: baseInput.storeId, organizationId: 888 });

    await expect(service.createEntry(baseInput, 999)).rejects.toThrow(BadRequestException);

    expect(prisma.entry.create).not.toHaveBeenCalled();
    expect(prisma.inventory.create).not.toHaveBeenCalled();
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
      prisma.entry.findUnique.mockResolvedValue({
        ...entryBase,
        organizationId: 55,
      });

      await service.deleteEntry(entryBase.id);

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
      expect(prisma.entry.delete).toHaveBeenCalledWith({ where: { id: entryBase.id } });
    });

    it('defaults organizationId to null during deletion when entry is legacy', async () => {
      prisma.entry.findUnique.mockResolvedValue({
        ...entryBase,
        organizationId: null,
      });

      await service.deleteEntry(entryBase.id);

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