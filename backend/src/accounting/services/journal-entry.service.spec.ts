import { Test, TestingModule } from '@nestjs/testing';
import { JournalEntryService, CreateJournalEntryDto } from './journal-entry.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

describe('JournalEntryService', () => {
  let service: JournalEntryService;
  let prisma: PrismaService;

  const mockTenant: TenantContext = {
    userId: 1,
    organizationId: 1,
    companyId: 1,
    organizationUnitId: null,
    isGlobalSuperAdmin: false,
    isOrganizationSuperAdmin: false,
    isSuperAdmin: false,
    allowedOrganizationIds: [1],
    allowedCompanyIds: [1],
    allowedOrganizationUnitIds: [],
  };

  const mockAccount1 = { id: 1, code: '10', name: 'Caja' };
  const mockAccount2 = { id: 2, code: '70', name: 'Ventas' };

  const mockPeriod = {
    id: 1,
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-28T23:59:59.999Z'),
    status: 'OPEN' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalEntryService,
        {
          provide: PrismaService,
          useValue: {
            journalEntry: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            period: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            account: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<JournalEntryService>(JournalEntryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a balanced journal entry', async () => {
      const dto: CreateJournalEntryDto = {
        date: new Date('2025-02-15'),
        description: 'Venta de contado',
        source: 'SALE',
        lines: [
          { accountId: 1, debit: 1000, credit: 0, description: 'Caja' },
          { accountId: 2, debit: 0, credit: 1000, description: 'Ventas' },
        ],
      };

      jest.spyOn(prisma.period, 'findFirst').mockResolvedValue(mockPeriod);
      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.journalEntry, 'create').mockResolvedValue({
        id: 1,
        journalId: 1,
        periodId: 1,
        date: dto.date,
        status: 'POSTED',
        description: dto.description,
        debitTotal: 1000,
        creditTotal: 1000,
        correlativo: 'M001',
        cuo: 'CUO1234567890123',
        sunatStatus: '1',
        source: 'SALE',
        moneda: 'PEN',
        tipoCambio: null,
        organizationId: 1,
        companyId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        lines: dto.lines.map((l, idx) => ({
          id: idx + 1,
          journalEntryId: 1,
          accountId: l.accountId,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          account: idx === 0 ? mockAccount1 : mockAccount2,
        })),
        period: mockPeriod,
      } as any);

      const result = await service.create(dto, mockTenant);

      expect(result).toBeDefined();
      expect(result.status).toBe('POSTED');
      expect(result.debitTotal).toBe(1000);
      expect(result.creditTotal).toBe(1000);
      expect(result.correlativo).toBe('M001');
      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });

    it('should throw error for unbalanced entry', async () => {
      const dto: CreateJournalEntryDto = {
        date: new Date('2025-02-15'),
        description: 'Unbalanced entry',
        source: 'MANUAL',
        lines: [
          { accountId: 1, debit: 1000, credit: 0 },
          { accountId: 2, debit: 0, credit: 500 }, // Descuadrado
        ],
      };

      await expect(service.create(dto, mockTenant)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for entry with less than 2 lines', async () => {
      const dto: CreateJournalEntryDto = {
        date: new Date('2025-02-15'),
        description: 'Invalid entry',
        source: 'MANUAL',
        lines: [{ accountId: 1, debit: 1000, credit: 0 }],
      };

      await expect(service.create(dto, mockTenant)).rejects.toThrow(
        'Un asiento debe tener al menos 2 líneas',
      );
    });

    it('should throw error for line with both debit and credit', async () => {
      const dto: CreateJournalEntryDto = {
        date: new Date('2025-02-15'),
        description: 'Invalid line',
        source: 'MANUAL',
        lines: [
          { accountId: 1, debit: 1000, credit: 500 }, // Inválido
          { accountId: 2, debit: 0, credit: 1500 },
        ],
      };

      await expect(service.create(dto, mockTenant)).rejects.toThrow(
        'Una línea no puede tener debe y haber al mismo tiempo',
      );
    });

    it('should generate sequential correlativo', async () => {
      jest.spyOn(prisma.period, 'findFirst').mockResolvedValue(mockPeriod);
      jest
        .spyOn(prisma.journalEntry, 'findFirst')
        .mockResolvedValueOnce({
          id: 1,
          correlativo: 'M005',
        } as any)
        .mockResolvedValueOnce(null);

      const dto: CreateJournalEntryDto = {
        date: new Date('2025-02-15'),
        description: 'Test correlativo',
        source: 'MANUAL',
        lines: [
          { accountId: 1, debit: 100, credit: 0 },
          { accountId: 2, debit: 0, credit: 100 },
        ],
      };

      jest.spyOn(prisma.journalEntry, 'create').mockResolvedValue({
        id: 2,
        correlativo: 'M006',
        organizationId: 1,
      } as any);

      const result = await service.create(dto, mockTenant);

      expect(result.correlativo).toBe('M006');
    });

    it('should create DRAFT for MANUAL source', async () => {
      const dto: CreateJournalEntryDto = {
        date: new Date('2025-02-15'),
        description: 'Manual entry',
        source: 'MANUAL',
        lines: [
          { accountId: 1, debit: 100, credit: 0 },
          { accountId: 2, debit: 0, credit: 100 },
        ],
      };

      jest.spyOn(prisma.period, 'findFirst').mockResolvedValue(mockPeriod);
      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.journalEntry, 'create').mockResolvedValue({
        id: 1,
        status: 'DRAFT',
        sunatStatus: '0',
      } as any);

      const result = await service.create(dto, mockTenant);

      expect(result.status).toBe('DRAFT');
      expect(result.sunatStatus).toBe('0');
    });

    it('should create POSTED for non-MANUAL source', async () => {
      const dto: CreateJournalEntryDto = {
        date: new Date('2025-02-15'),
        description: 'Sale entry',
        source: 'SALE',
        lines: [
          { accountId: 1, debit: 100, credit: 0 },
          { accountId: 2, debit: 0, credit: 100 },
        ],
      };

      jest.spyOn(prisma.period, 'findFirst').mockResolvedValue(mockPeriod);
      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.journalEntry, 'create').mockResolvedValue({
        id: 1,
        status: 'POSTED',
        sunatStatus: '1',
      } as any);

      const result = await service.create(dto, mockTenant);

      expect(result.status).toBe('POSTED');
      expect(result.sunatStatus).toBe('1');
    });
  });

  describe('findOne', () => {
    it('should return journal entry by id', async () => {
      const mockEntry = {
        id: 1,
        organizationId: 1,
        status: 'POSTED',
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(mockEntry as any);

      const result = await service.findOne(1, mockTenant);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(prisma.journalEntry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 1,
            organizationId: 1,
          },
        }),
      );
    });

    it('should throw NotFoundException if entry not found', async () => {
      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne(999, mockTenant)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update DRAFT entry', async () => {
      const existingEntry = {
        id: 1,
        status: 'DRAFT',
        debitTotal: 100,
        creditTotal: 100,
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(existingEntry as any);
      jest.spyOn(prisma.journalEntry, 'update').mockResolvedValue({
        ...existingEntry,
        description: 'Updated',
      } as any);

      const result = await service.update(1, { description: 'Updated' }, mockTenant);

      expect(result.description).toBe('Updated');
      expect(prisma.journalEntry.update).toHaveBeenCalled();
    });

    it('should throw error when updating POSTED entry', async () => {
      const existingEntry = {
        id: 1,
        status: 'POSTED',
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(existingEntry as any);

      await expect(
        service.update(1, { description: 'Updated' }, mockTenant),
      ).rejects.toThrow('Solo se pueden editar asientos en estado BORRADOR');
    });

    it('should validate balance when updating lines', async () => {
      const existingEntry = {
        id: 1,
        status: 'DRAFT',
        debitTotal: 100,
        creditTotal: 100,
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(existingEntry as any);

      await expect(
        service.update(
          1,
          {
            lines: [
              { accountId: 1, debit: 1000, credit: 0 },
              { accountId: 2, debit: 0, credit: 500 }, // Descuadrado
            ],
          },
          mockTenant,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('post', () => {
    it('should change DRAFT to POSTED', async () => {
      const draftEntry = {
        id: 1,
        status: 'DRAFT',
        debitTotal: 1000,
        creditTotal: 1000,
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(draftEntry as any);
      jest.spyOn(prisma.journalEntry, 'update').mockResolvedValue({
        ...draftEntry,
        status: 'POSTED',
        sunatStatus: '1',
      } as any);

      const result = await service.post(1, mockTenant);

      expect(result.status).toBe('POSTED');
      expect(result.sunatStatus).toBe('1');
      expect(prisma.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: 'POSTED',
            sunatStatus: '1',
          },
        }),
      );
    });

    it('should throw error when posting already POSTED entry', async () => {
      const postedEntry = {
        id: 1,
        status: 'POSTED',
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(postedEntry as any);

      await expect(service.post(1, mockTenant)).rejects.toThrow(
        'Solo se pueden registrar asientos en BORRADOR',
      );
    });

    it('should throw error when posting unbalanced entry', async () => {
      const unbalancedEntry = {
        id: 1,
        status: 'DRAFT',
        debitTotal: 1000,
        creditTotal: 500,
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(unbalancedEntry as any);

      await expect(service.post(1, mockTenant)).rejects.toThrow(
        'No se puede registrar un asiento descuadrado',
      );
    });
  });

  describe('void', () => {
    it('should change POSTED to VOID', async () => {
      const postedEntry = {
        id: 1,
        status: 'POSTED',
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(postedEntry as any);
      jest.spyOn(prisma.journalEntry, 'update').mockResolvedValue({
        ...postedEntry,
        status: 'VOID',
        sunatStatus: '8',
      } as any);

      const result = await service.void(1, mockTenant);

      expect(result.status).toBe('VOID');
      expect(result.sunatStatus).toBe('8');
      expect(prisma.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: 'VOID',
            sunatStatus: '8',
          },
        }),
      );
    });

    it('should throw error when voiding non-POSTED entry', async () => {
      const draftEntry = {
        id: 1,
        status: 'DRAFT',
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(draftEntry as any);

      await expect(service.void(1, mockTenant)).rejects.toThrow(
        'Solo se pueden anular asientos REGISTRADOS',
      );
    });
  });

  describe('delete', () => {
    it('should delete DRAFT entry', async () => {
      const draftEntry = {
        id: 1,
        status: 'DRAFT',
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(draftEntry as any);
      jest.spyOn(prisma.journalEntry, 'delete').mockResolvedValue(draftEntry as any);

      await service.delete(1, mockTenant);

      expect(prisma.journalEntry.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw error when deleting POSTED entry', async () => {
      const postedEntry = {
        id: 1,
        status: 'POSTED',
        organizationId: 1,
      };

      jest.spyOn(prisma.journalEntry, 'findFirst').mockResolvedValue(postedEntry as any);

      await expect(service.delete(1, mockTenant)).rejects.toThrow(
        'Solo se pueden eliminar asientos en BORRADOR',
      );
    });
  });

  describe('findAll', () => {
    it('should filter by date range', async () => {
      jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.journalEntry, 'count').mockResolvedValue(0);

      await service.findAll(
        {
          from: new Date('2025-02-01'),
          to: new Date('2025-02-28'),
        },
        mockTenant,
      );

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2025-02-01'),
              lte: new Date('2025-02-28'),
            },
          }),
        }),
      );
    });

    it('should filter by sources', async () => {
      jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.journalEntry, 'count').mockResolvedValue(0);

      await service.findAll(
        {
          sources: ['SALE', 'PURCHASE'],
        },
        mockTenant,
      );

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            source: { in: ['SALE', 'PURCHASE'] },
          }),
        }),
      );
    });

    it('should filter by account IDs', async () => {
      jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.journalEntry, 'count').mockResolvedValue(0);

      await service.findAll(
        {
          accountIds: [1, 2],
        },
        mockTenant,
      );

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lines: {
              some: {
                accountId: { in: [1, 2] },
              },
            },
          }),
        }),
      );
    });

    it('should respect multi-tenancy', async () => {
      jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.journalEntry, 'count').mockResolvedValue(0);

      await service.findAll({}, mockTenant);

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 1,
          }),
        }),
      );
    });
  });
});
