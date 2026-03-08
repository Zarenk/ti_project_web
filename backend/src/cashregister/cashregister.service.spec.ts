import { BadRequestException } from '@nestjs/common';
import { CashregisterService } from './cashregister.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

describe('CashregisterService (multi-organization)', () => {
  let service: CashregisterService;
  let prisma: any;
  let logOrganizationContextMock: jest.Mock;

  beforeEach(() => {
    prisma = {
      store: {
        findUnique: jest.fn(),
      },
      cash_registers: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      cash_transactions: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      cashTransactionPaymentMethod: {
        create: jest.fn(),
      },
      paymentMethod: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      cash_closures: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    const verticalConfig = {
      isFeatureEnabled: jest.fn().mockResolvedValue(true),
      getConfig: jest.fn().mockResolvedValue({ features: { sales: true } }),
    } as any;
    service = new CashregisterService(prisma, verticalConfig);
    logOrganizationContextMock = logOrganizationContext as jest.Mock;
    logOrganizationContextMock.mockClear();
  });

  describe('findOne', () => {
    it('applies organization filter when provided', async () => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue({
        id: 4,
        organizationId: 22,
      });

      const result = await service.findOne(4, { organizationId: 22 });

      expect(prisma.cash_registers.findFirst).toHaveBeenCalledWith({
        where: { id: 4, organizationId: 22 },
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });
      expect(result).toEqual({ id: 4, organizationId: 22 });
    });

    it('throws when cash register not found for tenant', async () => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(9, { organizationId: 1 })).rejects.toThrow(
        /No se encontro la caja con ID 9/,
      );
    });
  });

  describe('create', () => {
    it('propagates provided organizationId and logs context', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 42,
        companyId: null,
      });
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cash_registers.create as jest.Mock).mockResolvedValue({ id: 1 });

      await service.create({
        name: 'Caja Principal',
        description: 'Principal',
        storeId: 5,
        initialBalance: 150,
        organizationId: 42,
      });

      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 5 },
        select: { id: true, organizationId: true, companyId: true },
      });
      expect(prisma.cash_registers.findFirst).toHaveBeenCalledWith({
        where: {
          storeId: 5,
          status: 'ACTIVE',
          organizationId: 42,
          store: { companyId: null },
        },
      });
      expect(prisma.cash_registers.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          storeId: 5,
          organizationId: 42,
          currentBalance: 150,
        }),
      });
      expect(logOrganizationContextMock).toHaveBeenCalledWith({
        service: CashregisterService.name,
        operation: 'create',
        organizationId: 42,
        companyId: null,
        metadata: { storeId: 5 },
      });
    });

    it('falls back to store organization when not provided', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 9,
        companyId: 31,
      });
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cash_registers.create as jest.Mock).mockResolvedValue({ id: 10 });

      await service.create({
        name: 'Caja Secundaria',
        storeId: 8,
        initialBalance: 75,
      });

      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 8 },
        select: { id: true, organizationId: true, companyId: true },
      });
      expect(prisma.cash_registers.findFirst).toHaveBeenCalledWith({
        where: {
          storeId: 8,
          status: 'ACTIVE',
          organizationId: 9,
          store: { companyId: 31 },
        },
      });
      expect(prisma.cash_registers.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: 9 }),
      });
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 9, companyId: 31 }),
      );
    });

    it('throws when store organization mismatches provided', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        organizationId: 3,
        companyId: 14,
      });

      await expect(
        service.create({
          name: 'Caja',
          storeId: 1,
          initialBalance: 10,
          organizationId: 5,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, organizationId: true, companyId: true },
      });
    });
  });

  describe('findAll', () => {
    it('applies organization filter when provided', async () => {
      (prisma.cash_registers.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({ organizationId: 21 });

      expect(prisma.cash_registers.findMany).toHaveBeenCalledWith({
        where: { organizationId: 21 },
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });
    });

    it('omits organization filter when undefined', async () => {
      (prisma.cash_registers.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll();

      expect(prisma.cash_registers.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });
    });

    it('supports querying legacy records with null organizationId', async () => {
      (prisma.cash_registers.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({ organizationId: null });

      expect(prisma.cash_registers.findMany).toHaveBeenCalledWith({
        where: { organizationId: null },
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });
    });
  });

  describe('getCashRegisterBalance', () => {
    it('propagates organization filter when provided', async () => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue({
        currentBalance: 150,
        organizationId: 9,
      });

      await service.getCashRegisterBalance(4, { organizationId: 9 });

      expect(prisma.cash_registers.findFirst).toHaveBeenCalledWith({
        where: { storeId: 4, status: 'ACTIVE', organizationId: 9 },
        select: { currentBalance: true, organizationId: true },
      });
    });

    it('returns null when cash register not found', async () => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getCashRegisterBalance(2, {
        organizationId: 7,
      });

      expect(result).toBeNull();
    });
  });

  describe('getActiveCashRegister', () => {
    it('passes organization filter to prisma query', async () => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue(null);

      await service.getActiveCashRegister(8, { organizationId: 5 });

      expect(prisma.cash_registers.findFirst).toHaveBeenCalledWith({
        where: { storeId: 8, status: 'ACTIVE', organizationId: 5 },
        select: {
          id: true,
          name: true,
          currentBalance: true,
          initialBalance: true,
          organizationId: true,
        },
      });
    });

    it('omits organization filter when undefined', async () => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue({ id: 1 });

      await service.getActiveCashRegister(3);

      expect(prisma.cash_registers.findFirst).toHaveBeenCalledWith({
        where: { storeId: 3, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          currentBalance: true,
          initialBalance: true,
          organizationId: true,
        },
      });
    });
  });

  describe('createTransaction', () => {
    beforeEach(() => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 11 });
      (prisma.paymentMethod.findFirst as jest.Mock).mockResolvedValue({
        id: 7,
      });
      (
        prisma.cashTransactionPaymentMethod.create as jest.Mock
      ).mockResolvedValue({});
      (prisma.cash_registers.update as jest.Mock).mockResolvedValue({ id: 15 });
    });

    it('uses cash register organization when not provided', async () => {
      (prisma.cash_registers.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        status: 'ACTIVE',
        currentBalance: 50,
        organizationId: 77,
        store: { organizationId: 77 },
      });
      (prisma.cash_transactions.create as jest.Mock).mockResolvedValue({
        id: 30,
      });

      const result = await service.createTransaction({
        cashRegisterId: 2,
        userId: 11,
        type: 'INCOME',
        amount: 25,
        description: 'Ingreso',
        paymentMethods: [{ method: 'Efectivo', amount: 25 }],
      });

      expect(result).toEqual({ id: 30 });
      expect(prisma.cash_transactions.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: 77 }),
      });
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'createTransaction',
          organizationId: 77,
        }),
      );
    });

    it('validates organization consistency when provided', async () => {
      (prisma.cash_registers.findUnique as jest.Mock).mockResolvedValue({
        id: 9,
        status: 'ACTIVE',
        currentBalance: 100,
        organizationId: 81,
        store: { organizationId: 81 },
      });

      await expect(
        service.createTransaction({
          cashRegisterId: 9,
          userId: 11,
          type: 'INCOME',
          amount: 10,
          paymentMethods: [{ method: 'Efectivo', amount: 10 }],
          organizationId: 500,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getTransactionsByStoreAndDate', () => {
    const startOfDay = new Date('2024-05-01T00:00:00.000Z');
    const endOfDay = new Date('2024-05-01T23:59:59.999Z');

    beforeEach(() => {
      (prisma.cash_transactions.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.cash_closures.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('applies organization filter on transactions and closures', async () => {
      await service.getTransactionsByStoreAndDate(10, startOfDay, endOfDay, {
        organizationId: 6,
      });

      expect(prisma.cash_transactions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 6,
            cash_registers: { storeId: 10, organizationId: 6 },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      );
      expect(prisma.cash_closures.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 6,
            cash_registers: { storeId: 10, organizationId: 6 },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      );
    });

    it('omits organization filter when not provided', async () => {
      await service.getTransactionsByStoreAndDate(7, startOfDay, endOfDay);

      expect(prisma.cash_transactions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cash_registers: { storeId: 7 },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      );
      expect(prisma.cash_closures.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cash_registers: { storeId: 7 },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      );
    });

    it('incluye los nombres completos de los productos en saleItems, incluso con tildes', async () => {
      const createdAt = new Date('2024-05-01T15:00:00.000Z');
      (prisma.cash_transactions.findMany as jest.Mock).mockResolvedValue([
        {
          id: 99,
          cashRegisterId: 12,
          type: 'INCOME',
          amount: 53.5,
          createdAt,
          userId: 5,
          user: { username: 'ecoterradmin' },
          description: 'Venta registrada',
          paymentMethods: [],
          salePayments: [
            {
              sale: {
                client: null,
                invoices: [],
                salesDetails: [
                  {
                    productId: 1,
                    quantity: 1,
                    price: 16.5,
                    entryDetail: {
                      product: {
                        name: 'MANTEQUILLA DE MANÍ 100% 230 GR SPREAD',
                      },
                    },
                  },
                  {
                    productId: 2,
                    quantity: 1,
                    price: 14,
                    entryDetail: {
                      product: {
                        name: 'JABÓN DE ARROZ YXANE',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ]);
      (prisma.cash_closures.findMany as jest.Mock).mockResolvedValue([]);

      const records = await service.getTransactionsByStoreAndDate(
        3,
        startOfDay,
        endOfDay,
      );

      expect(records).toHaveLength(1);
      const saleRecord = records.find(
        (record) => record.type !== 'CLOSURE',
      ) as any;
      expect(saleRecord?.saleItems).toEqual([
        {
          name: 'MANTEQUILLA DE MANÍ 100% 230 GR SPREAD',
          quantity: 1,
          unitPrice: 16.5,
          total: 16.5,
        },
        {
          name: 'JABÓN DE ARROZ YXANE',
          quantity: 1,
          unitPrice: 14,
          total: 14,
        },
      ]);
    });
  });

  describe('findAllTransaction', () => {
    it('filters by organization when provided', async () => {
      (prisma.cash_transactions.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllTransaction({ organizationId: 3 });

      expect(prisma.cash_transactions.findMany).toHaveBeenCalledWith({
        where: { organizationId: 3 },
        include: {
          cash_registers: true,
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('omits organization filter for global queries', async () => {
      (prisma.cash_transactions.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllTransaction();

      expect(prisma.cash_transactions.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          cash_registers: true,
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByCashRegister', () => {
    it('combines cash register id with organization filter', async () => {
      (prisma.cash_transactions.findMany as jest.Mock).mockResolvedValue([]);

      await service.findByCashRegister(11, { organizationId: null });

      expect(prisma.cash_transactions.findMany).toHaveBeenCalledWith({
        where: { cashRegisterId: 11, organizationId: null },
        include: {
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('omits organization filter when undefined', async () => {
      (prisma.cash_transactions.findMany as jest.Mock).mockResolvedValue([]);

      await service.findByCashRegister(12);

      expect(prisma.cash_transactions.findMany).toHaveBeenCalledWith({
        where: { cashRegisterId: 12 },
        include: {
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createClosure', () => {
    beforeEach(() => {
      (prisma.$transaction as jest.Mock).mockImplementation((callback: any) =>
        callback(prisma),
      );
      (prisma.cash_registers.update as jest.Mock).mockResolvedValue({
        id: 1,
        initialBalance: 100,
        currentBalance: 80,
      });
      (prisma.cash_closures.create as jest.Mock).mockResolvedValue({
        id: 3,
        openingBalance: 100,
        closingBalance: 80,
        totalIncome: 20,
        totalExpense: 40,
        nextOpeningBalance: 80,
        organizationId: 15,
      });
      (prisma.cash_registers.create as jest.Mock).mockResolvedValue({
        id: 4,
        initialBalance: 80,
        currentBalance: 80,
        organizationId: 15,
      });
      (prisma.cash_registers.findUnique as jest.Mock).mockResolvedValueOnce(null);
    });

    it('propagates organization from cash register when closing', async () => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
        storeId: 5,
        name: 'Caja',
        organizationId: 15,
        store: { organizationId: 15 },
        description: 'Caja Principal',
      });

      const response = await service.createClosure({
        storeId: 5,
        cashRegisterId: 1,
        userId: 9,
        openingBalance: 100,
        closingBalance: 80,
        totalIncome: 20,
        totalExpense: 40,
        organizationId: null,
      });

      expect(prisma.cash_closures.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: 15 }),
      });
      expect(prisma.cash_registers.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: 15 }),
      });
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'createClosure',
          organizationId: 15,
        }),
      );
      expect((response as any).closure.organizationId).toBe(15);
    });

    it('validates organization mismatches', async () => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
        storeId: 5,
        name: 'Caja',
        organizationId: 12,
        store: { organizationId: 12 },
        description: 'Caja Principal',
      });

      await expect(
        service.createClosure({
          storeId: 5,
          cashRegisterId: 1,
          userId: 9,
          openingBalance: 100,
          closingBalance: 80,
          totalIncome: 20,
          totalExpense: 40,
          organizationId: 999,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getClosuresByStore', () => {
    it('applies organization filter to closures and related register', async () => {
      (prisma.cash_closures.findMany as jest.Mock).mockResolvedValue([]);

      await service.getClosuresByStore(4, { organizationId: 13 });

      expect(prisma.cash_closures.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 13,
          cash_registers: { storeId: 4, organizationId: 13 },
        },
        include: {
          user: true,
          cash_registers: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getClosureByStoreAndDate', () => {
    it('propagates organization filter when provided', async () => {
      (prisma.cash_closures.findFirst as jest.Mock).mockResolvedValue(null);
      const baseDate = new Date('2024-04-30T12:34:56.000Z');
      const expectedStart = new Date(baseDate);
      expectedStart.setHours(0, 0, 0, 0);
      const expectedEnd = new Date(baseDate);
      expectedEnd.setHours(23, 59, 59, 999);

      await service.getClosureByStoreAndDate(9, baseDate, {
        organizationId: 2,
      });

      expect(prisma.cash_closures.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 2,
          cash_registers: { storeId: 9, organizationId: 2 },
          createdAt: { gte: expectedStart, lte: expectedEnd },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findAllClosure', () => {
    it('filters by organization when provided', async () => {
      (prisma.cash_closures.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllClosure({ organizationId: 5 });

      expect(prisma.cash_closures.findMany).toHaveBeenCalledWith({
        where: { organizationId: 5 },
        include: {
          cash_registers: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('omits organization filter when undefined', async () => {
      (prisma.cash_closures.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllClosure();

      expect(prisma.cash_closures.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          cash_registers: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue({
        id: 3,
        name: 'Principal',
        organizationId: 12,
        store: { organizationId: 12 },
      });
      (prisma.cash_registers.update as jest.Mock).mockResolvedValue({ id: 3 });
    });

    it('resolves organizationId using existing record', async () => {
      const result = await service.update(3, {
        name: 'Caja',
        organizationId: undefined,
      });

      expect(prisma.cash_registers.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: expect.objectContaining({ organizationId: 12, name: 'Caja' }),
      });
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'update', organizationId: 12 }),
      );
      expect(result).toEqual({ id: 3 });
    });

    it('throws when organization mismatches existing record', async () => {
      await expect(
        service.update(3, { name: 'Caja', organizationId: 99 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('validates organization before deleting', async () => {
      (prisma.cash_registers.findFirst as jest.Mock).mockResolvedValue({
        id: 7,
        organizationId: 5,
      });
      (prisma.cash_registers.delete as jest.Mock).mockResolvedValue({ id: 7 });

      const result = await service.remove(7, { organizationId: 5 });

      expect(prisma.cash_registers.findFirst).toHaveBeenCalledWith({
        where: { id: 7, organizationId: 5 },
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });
      expect(prisma.cash_registers.delete).toHaveBeenCalledWith({
        where: { id: 7 },
      });
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'remove', organizationId: 5 }),
      );
      expect(result).toEqual({ id: 7 });
    });
  });
});
