jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

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
  entry: { create: jest.Mock };
  entryDetail: { update: jest.Mock };
  entryDetailSeries: { createMany: jest.Mock };
  inventory: { findFirst: jest.Mock; create: jest.Mock };
  storeOnInventory: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  inventoryHistory: { create: jest.Mock };
  invoice: { create: jest.Mock };
  $transaction: jest.Mock;
}

const createPrismaMock = (): PrismaMock => ({
  store: { findUnique: jest.fn() },
  provider: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  product: { findUnique: jest.fn() },
  entry: { create: jest.fn() },
  entryDetail: { update: jest.fn() },
  entryDetailSeries: { createMany: jest.fn() },
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
});