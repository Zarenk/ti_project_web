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
      cashRegister: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      cashTransaction: {
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
      cashClosure: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    service = new CashregisterService(prisma);
    logOrganizationContextMock = logOrganizationContext as jest.Mock;
    logOrganizationContextMock.mockClear();
  });

  describe('findOne', () => {
    it('applies organization filter when provided', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({ id: 4, organizationId: 22 });

      const result = await service.findOne(4, { organizationId: 22 });

      expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
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
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(9, { organizationId: 1 })).rejects.toThrow(
        /No se encontró la caja con ID 9/,
      );
    });
  });

  describe('create', () => {
    it('propagates provided organizationId and logs context', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({ organizationId: 42 });
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cashRegister.create as jest.Mock).mockResolvedValue({ id: 1 });

      await service.create({
        name: 'Caja Principal',
        description: 'Principal',
        storeId: 5,
        initialBalance: 150,
        organizationId: 42,
      });

      expect(prisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 5 },
      });
      expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
        where: { storeId: 5, status: 'ACTIVE', organizationId: 42 },
      });
      expect(prisma.cashRegister.create).toHaveBeenCalledWith({
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
        metadata: { storeId: 5 },
      });
    });

    it('falls back to store organization when not provided', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({ organizationId: 9 });
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cashRegister.create as jest.Mock).mockResolvedValue({ id: 10 });

      await service.create({
        name: 'Caja Secundaria',
        storeId: 8,
        initialBalance: 75,
      });

      expect(prisma.cashRegister.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: 9 }),
      });
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 9 }),
      );
    });

    it('throws when store organization mismatches provided', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({ organizationId: 3 });

      await expect(
        service.create({
          name: 'Caja',
          storeId: 1,
          initialBalance: 10,
          organizationId: 5,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('applies organization filter when provided', async () => {
      (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({ organizationId: 21 });

      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith({
        where: { organizationId: 21 },
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });
    });

    it('omits organization filter when undefined', async () => {
      (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll();

      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });
    });

    it('supports querying legacy records with null organizationId', async () => {
      (prisma.cashRegister.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAll({ organizationId: null });

      expect(prisma.cashRegister.findMany).toHaveBeenCalledWith({
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
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
        currentBalance: 150,
        organizationId: 9,
      });

      await service.getCashRegisterBalance(4, { organizationId: 9 });

      expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
        where: { storeId: 4, status: 'ACTIVE', organizationId: 9 },
        select: { currentBalance: true, organizationId: true },
      });
    });

    it('returns null when cash register not found', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getCashRegisterBalance(2, { organizationId: 7 });

      expect(result).toBeNull();
    });
  });

  describe('getActiveCashRegister', () => {
    it('passes organization filter to prisma query', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue(null);

      await service.getActiveCashRegister(8, { organizationId: 5 });

      expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
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
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({ id: 1 });

      await service.getActiveCashRegister(3);

      expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
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
      (prisma.paymentMethod.findFirst as jest.Mock).mockResolvedValue({ id: 7 });
      (prisma.cashTransactionPaymentMethod.create as jest.Mock).mockResolvedValue({});
      (prisma.cashRegister.update as jest.Mock).mockResolvedValue({ id: 15 });
    });

    it('uses cash register organization when not provided', async () => {
      (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        status: 'ACTIVE',
        currentBalance: 50,
        organizationId: 77,
        store: { organizationId: 77 },
      });
      (prisma.cashTransaction.create as jest.Mock).mockResolvedValue({ id: 30 });

      const result = await service.createTransaction({
        cashRegisterId: 2,
        userId: 11,
        type: 'INCOME',
        amount: 25,
        description: 'Ingreso',
        paymentMethods: [{ method: 'Efectivo', amount: 25 }],
      });

      expect(result).toEqual({ id: 30 });
      expect(prisma.cashTransaction.create).toHaveBeenCalledWith({
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
      (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValue({
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
      (prisma.cashTransaction.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.cashClosure.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('applies organization filter on transactions and closures', async () => {
      await service.getTransactionsByStoreAndDate(10, startOfDay, endOfDay, {
        organizationId: 6,
      });

      expect(prisma.cashTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 6,
            cashRegister: { storeId: 10, organizationId: 6 },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      );
      expect(prisma.cashClosure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 6,
            cashRegister: { storeId: 10, organizationId: 6 },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      );
    });

    it('omits organization filter when not provided', async () => {
      await service.getTransactionsByStoreAndDate(7, startOfDay, endOfDay);

      expect(prisma.cashTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cashRegister: { storeId: 7 },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      );
      expect(prisma.cashClosure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cashRegister: { storeId: 7 },
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      );
    });
  });

  describe('findAllTransaction', () => {
    it('filters by organization when provided', async () => {
      (prisma.cashTransaction.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllTransaction({ organizationId: 3 });

      expect(prisma.cashTransaction.findMany).toHaveBeenCalledWith({
        where: { organizationId: 3 },
        include: {
          cashRegister: true,
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('omits organization filter for global queries', async () => {
      (prisma.cashTransaction.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllTransaction();

      expect(prisma.cashTransaction.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          cashRegister: true,
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByCashRegister', () => {
    it('combines cash register id with organization filter', async () => {
      (prisma.cashTransaction.findMany as jest.Mock).mockResolvedValue([]);

      await service.findByCashRegister(11, { organizationId: null });

      expect(prisma.cashTransaction.findMany).toHaveBeenCalledWith({
        where: { cashRegisterId: 11, organizationId: null },
        include: {
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('omits organization filter when undefined', async () => {
      (prisma.cashTransaction.findMany as jest.Mock).mockResolvedValue([]);

      await service.findByCashRegister(12);

      expect(prisma.cashTransaction.findMany).toHaveBeenCalledWith({
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
      (prisma.$transaction as jest.Mock).mockImplementation((callback: any) => callback(prisma));
      (prisma.cashRegister.update as jest.Mock).mockResolvedValue({
        id: 1,
        initialBalance: 100,
        currentBalance: 80,
      });
      (prisma.cashClosure.create as jest.Mock).mockResolvedValue({
        id: 3,
        openingBalance: 100,
        closingBalance: 80,
        totalIncome: 20,
        totalExpense: 40,
        nextOpeningBalance: 80,
        organizationId: 15,
      });
      (prisma.cashRegister.create as jest.Mock).mockResolvedValue({
        id: 4,
        initialBalance: 80,
        currentBalance: 80,
        organizationId: 15,
      });
      (prisma.cashRegister.findUnique as jest.Mock).mockResolvedValueOnce(null);
    });

    it('propagates organization from cash register when closing', async () => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
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

      expect(prisma.cashClosure.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: 15 }),
      });
      expect(prisma.cashRegister.create).toHaveBeenCalledWith({
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
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
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
      (prisma.cashClosure.findMany as jest.Mock).mockResolvedValue([]);

      await service.getClosuresByStore(4, { organizationId: 13 });

      expect(prisma.cashClosure.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 13,
          cashRegister: { storeId: 4, organizationId: 13 },
        },
        include: {
          user: true,
          cashRegister: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getClosureByStoreAndDate', () => {
    it('propagates organization filter when provided', async () => {
      (prisma.cashClosure.findFirst as jest.Mock).mockResolvedValue(null);
      const baseDate = new Date('2024-04-30T12:34:56.000Z');
      const expectedStart = new Date(baseDate);
      expectedStart.setHours(0, 0, 0, 0);
      const expectedEnd = new Date(baseDate);
      expectedEnd.setHours(23, 59, 59, 999);

      await service.getClosureByStoreAndDate(9, baseDate, { organizationId: 2 });

      expect(prisma.cashClosure.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 2,
          cashRegister: { storeId: 9, organizationId: 2 },
          createdAt: { gte: expectedStart, lte: expectedEnd },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findAllClosure', () => {
    it('filters by organization when provided', async () => {
      (prisma.cashClosure.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllClosure({ organizationId: 5 });

      expect(prisma.cashClosure.findMany).toHaveBeenCalledWith({
        where: { organizationId: 5 },
        include: {
          cashRegister: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('omits organization filter when undefined', async () => {
      (prisma.cashClosure.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllClosure();

      expect(prisma.cashClosure.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          cashRegister: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
        id: 3,
        name: 'Principal',
        organizationId: 12,
        store: { organizationId: 12 },
      });
      (prisma.cashRegister.update as jest.Mock).mockResolvedValue({ id: 3 });
    });

    it('resolves organizationId using existing record', async () => {
      const result = await service.update(3, { name: 'Caja', organizationId: undefined });

      expect(prisma.cashRegister.update).toHaveBeenCalledWith({
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
      (prisma.cashRegister.findFirst as jest.Mock).mockResolvedValue({
        id: 7,
        organizationId: 5,
      });
      (prisma.cashRegister.delete as jest.Mock).mockResolvedValue({ id: 7 });

      const result = await service.remove(7, { organizationId: 5 });

      expect(prisma.cashRegister.findFirst).toHaveBeenCalledWith({
        where: { id: 7, organizationId: 5 },
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });
      expect(prisma.cashRegister.delete).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(logOrganizationContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'remove', organizationId: 5 }),
      );
      expect(result).toEqual({ id: 7 });
    });
  });

});