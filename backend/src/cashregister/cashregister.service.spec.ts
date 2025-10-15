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
});