import { Test, TestingModule } from '@nestjs/testing';
import { PleExportService } from './ple-export.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

describe('PleExportService', () => {
  let service: PleExportService;
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

  const mockCompany = {
    id: 1,
    sunatRuc: '20123456789',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PleExportService,
        {
          provide: PrismaService,
          useValue: {
            company: {
              findFirst: jest.fn(),
            },
            journalEntry: {
              findMany: jest.fn(),
            },
            account: {
              findMany: jest.fn(),
            },
            journalLine: {
              aggregate: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PleExportService>(PleExportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('exportLibroDiario', () => {
    it('should export Libro Diario in PLE 5.1 format', async () => {
      const period = {
        from: new Date(2025, 1, 1), // February 1, 2025
        to: new Date(2025, 1, 28), // February 28, 2025
      };

      const mockEntries = [
        {
          id: 1,
          date: new Date(2025, 1, 15), // February 15, 2025
          cuo: 'CUO123',
          correlativo: 'M001',
          description: 'Venta de contado',
          sunatStatus: '1',
          lines: [
            {
              id: 1,
              description: 'Caja',
              debit: 1180,
              credit: 0,
              account: { code: '10' },
            },
            {
              id: 2,
              description: 'Ventas',
              debit: 0,
              credit: 1000,
              account: { code: '70' },
            },
            {
              id: 3,
              description: 'IGV',
              debit: 0,
              credit: 180,
              account: { code: '40' },
            },
          ],
        },
      ];

      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompany as any);
      jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue(mockEntries as any);

      const result = await service.exportLibroDiario(period, mockTenant);

      expect(result).toContain('20123456789');
      expect(result).toContain('202502');
      expect(result).toContain('CUO123');
      expect(result).toContain('M001');
      expect(result).toContain('15/02/2025');
      expect(result).toContain('Venta de contado');
      expect(result).toContain('10');
      expect(result).toContain('1180.00');
      expect(result).toContain('70');
      expect(result).toContain('1000.00');
      expect(result).toContain('40');
      expect(result).toContain('180.00');

      // Verificar formato pipe-separated
      const lines = result.split('\n');
      expect(lines.length).toBe(3); // 3 líneas
      expect(lines[0].split('|').length).toBeGreaterThan(10);
    });

    it('should handle empty period', async () => {
      const period = {
        from: new Date(2025, 1, 1),
        to: new Date(2025, 1, 28),
      };

      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompany as any);
      jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue([]);

      const result = await service.exportLibroDiario(period, mockTenant);

      expect(result).toBe('');
    });

    it('should filter only POSTED entries', async () => {
      const period = {
        from: new Date(2025, 1, 1),
        to: new Date(2025, 1, 28),
      };

      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompany as any);
      jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue([]);

      await service.exportLibroDiario(period, mockTenant);

      expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'POSTED',
          }),
        }),
      );
    });

    it('should use default RUC if company not found', async () => {
      const period = {
        from: new Date(2025, 1, 1),
        to: new Date(2025, 1, 28),
      };

      const mockEntries = [
        {
          date: new Date(2025, 1, 15),
          cuo: 'CUO123',
          correlativo: 'M001',
          sunatStatus: '1',
          lines: [
            {
              description: 'Test',
              debit: 100,
              credit: 0,
              account: { code: '10' },
            },
            {
              description: 'Test',
              debit: 0,
              credit: 100,
              account: { code: '70' },
            },
          ],
        },
      ];

      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.journalEntry, 'findMany').mockResolvedValue(mockEntries as any);

      const result = await service.exportLibroDiario(period, mockTenant);

      expect(result).toContain('00000000000'); // Default RUC
    });
  });

  describe('exportLibroMayor', () => {
    it('should export Libro Mayor in PLE 6.1 format', async () => {
      const period = {
        from: new Date(2025, 1, 1),
        to: new Date(2025, 1, 28),
      };

      const mockAccounts = [
        { id: 1, code: '10', isPosting: true },
        { id: 2, code: '70', isPosting: true },
      ];

      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompany as any);
      jest.spyOn(prisma.account, 'findMany').mockResolvedValue(mockAccounts as any);

      // Mock inicial balance (antes del período)
      jest
        .spyOn(prisma.journalLine, 'aggregate')
        .mockResolvedValueOnce({
          _sum: { debit: 5000, credit: 0 },
        } as any)
        .mockResolvedValueOnce({
          _sum: { debit: 10000, credit: 5000 },
        } as any)
        .mockResolvedValueOnce({
          _sum: { debit: 0, credit: 3000 },
        } as any)
        .mockResolvedValueOnce({
          _sum: { debit: 0, credit: 2000 },
        } as any);

      const result = await service.exportLibroMayor(period, mockTenant);

      expect(result).toContain('20123456789');
      expect(result).toContain('202502');
      expect(result).toContain('10');
      expect(result).toContain('70');

      const lines = result.split('\n');
      expect(lines.length).toBe(2); // 2 cuentas con movimiento
    });

    it('should exclude accounts without movement', async () => {
      const period = {
        from: new Date(2025, 1, 1),
        to: new Date(2025, 1, 28),
      };

      const mockAccounts = [
        { id: 1, code: '10', isPosting: true },
        { id: 2, code: '70', isPosting: true },
      ];

      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompany as any);
      jest.spyOn(prisma.account, 'findMany').mockResolvedValue(mockAccounts as any);

      // Cuenta 10: con movimiento
      // Cuenta 70: sin movimiento
      jest
        .spyOn(prisma.journalLine, 'aggregate')
        .mockResolvedValueOnce({
          _sum: { debit: 5000, credit: 0 },
        } as any)
        .mockResolvedValueOnce({
          _sum: { debit: 1000, credit: 0 },
        } as any)
        .mockResolvedValueOnce({
          _sum: { debit: 0, credit: 0 },
        } as any)
        .mockResolvedValueOnce({
          _sum: { debit: 0, credit: 0 },
        } as any);

      const result = await service.exportLibroMayor(period, mockTenant);

      const lines = result.split('\n').filter((l) => l.trim());
      expect(lines.length).toBe(1); // Solo cuenta 10
      expect(result).toContain('10');
      expect(result).not.toContain('70');
    });

    it('should calculate debit/credit balances correctly', async () => {
      const period = {
        from: new Date(2025, 1, 1),
        to: new Date(2025, 1, 28),
      };

      const mockAccounts = [{ id: 1, code: '10', isPosting: true }];

      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompany as any);
      jest.spyOn(prisma.account, 'findMany').mockResolvedValue(mockAccounts as any);

      // Saldo inicial: D=1000, C=0 → Saldo deudor 1000
      // Movimiento: D=500, C=200 → Debe 500, Haber 200
      // Saldo final: (1000+500) - 200 = 1300 deudor
      jest
        .spyOn(prisma.journalLine, 'aggregate')
        .mockResolvedValueOnce({
          _sum: { debit: 1000, credit: 0 },
        } as any)
        .mockResolvedValueOnce({
          _sum: { debit: 500, credit: 200 },
        } as any);

      const result = await service.exportLibroMayor(period, mockTenant);

      const parts = result.split('|');
      expect(parts[3]).toBe('1000.00'); // Saldo inicial deudor
      expect(parts[4]).toBe('0.00'); // Saldo inicial acreedor
      expect(parts[5]).toBe('500.00'); // Debe del período
      expect(parts[6]).toBe('200.00'); // Haber del período
      expect(parts[7]).toBe('1300.00'); // Saldo final deudor
      expect(parts[8]).toBe('0.00'); // Saldo final acreedor
    });
  });
});
