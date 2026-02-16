import { Test, TestingModule } from '@nestjs/testing';
import { AccountMappingService } from './account-mapping.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

describe('AccountMappingService', () => {
  let service: AccountMappingService;
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

  const mockAccount = {
    id: 1,
    code: '10',
    name: 'Efectivo y Equivalentes de Efectivo',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountMappingService,
        {
          provide: PrismaService,
          useValue: {
            account: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AccountMappingService>(AccountMappingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getAccountByCode', () => {
    it('should return account by code', async () => {
      jest.spyOn(prisma.account, 'findFirst').mockResolvedValue(mockAccount as any);

      const result = await service.getAccountByCode('10', mockTenant);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.code).toBe('10');
      expect(result.name).toBe('Efectivo y Equivalentes de Efectivo');
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          code: '10',
          organizationId: 1,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });
    });

    it('should throw NotFoundException if account not found', async () => {
      jest.spyOn(prisma.account, 'findFirst').mockResolvedValue(null);

      await expect(service.getAccountByCode('999', mockTenant)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getAccountByCode('999', mockTenant)).rejects.toThrow(
        'Cuenta con código 999 no encontrada',
      );
    });

    it('should throw error if tenant is invalid', async () => {
      await expect(service.getAccountByCode('10', null)).rejects.toThrow(
        'Se requiere un tenant válido',
      );
    });

    it('should respect multi-tenancy', async () => {
      jest.spyOn(prisma.account, 'findFirst').mockResolvedValue(mockAccount as any);

      await service.getAccountByCode('10', mockTenant);

      expect(prisma.account.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 1,
          }),
        }),
      );
    });
  });

  describe('getAccountsByCodes', () => {
    it('should return multiple accounts by codes', async () => {
      const mockAccounts = [
        { id: 1, code: '10', name: 'Caja' },
        { id: 2, code: '70', name: 'Ventas' },
        { id: 3, code: '40', name: 'IGV' },
      ];

      jest.spyOn(prisma.account, 'findMany').mockResolvedValue(mockAccounts as any);

      const result = await service.getAccountsByCodes(['10', '70', '40'], mockTenant);

      expect(result.size).toBe(3);
      expect(result.get('10')).toEqual(mockAccounts[0]);
      expect(result.get('70')).toEqual(mockAccounts[1]);
      expect(result.get('40')).toEqual(mockAccounts[2]);
    });

    it('should throw error if any account is missing', async () => {
      const mockAccounts = [
        { id: 1, code: '10', name: 'Caja' },
        { id: 2, code: '70', name: 'Ventas' },
      ];

      jest.spyOn(prisma.account, 'findMany').mockResolvedValue(mockAccounts as any);

      await expect(
        service.getAccountsByCodes(['10', '70', '999'], mockTenant),
      ).rejects.toThrow('Cuentas no encontradas: 999');
    });

    it('should respect multi-tenancy', async () => {
      const mockAccount = { id: 1, code: '10', name: 'Caja' };
      jest.spyOn(prisma.account, 'findMany').mockResolvedValue([mockAccount] as any);

      await service.getAccountsByCodes(['10'], mockTenant);

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 1,
          }),
        }),
      );
    });
  });

  describe('accountExists', () => {
    it('should return true if account exists', async () => {
      jest.spyOn(prisma.account, 'count').mockResolvedValue(1);

      const result = await service.accountExists('10', mockTenant);

      expect(result).toBe(true);
      expect(prisma.account.count).toHaveBeenCalledWith({
        where: {
          code: '10',
          organizationId: 1,
        },
      });
    });

    it('should return false if account does not exist', async () => {
      jest.spyOn(prisma.account, 'count').mockResolvedValue(0);

      const result = await service.accountExists('999', mockTenant);

      expect(result).toBe(false);
    });

    it('should return false if tenant is invalid', async () => {
      const result = await service.accountExists('10', null);

      expect(result).toBe(false);
    });
  });

  describe('getCommonAccounts', () => {
    it('should return common accounts map', async () => {
      const mockAccounts = [
        { id: 1, code: '10', name: 'Caja' },
        { id: 2, code: '104', name: 'Banco' },
        { id: 3, code: '70', name: 'Ventas' },
        { id: 4, code: '60', name: 'Compras' },
        { id: 5, code: '40', name: 'IGV' },
        { id: 6, code: '69', name: 'Costo de Ventas' },
        { id: 7, code: '20', name: 'Mercaderías' },
      ];

      jest.spyOn(prisma.account, 'findMany').mockResolvedValue(mockAccounts as any);

      const result = await service.getCommonAccounts(mockTenant);

      expect(result.caja).toEqual(mockAccounts[0]);
      expect(result.banco).toEqual(mockAccounts[1]);
      expect(result.ventas).toEqual(mockAccounts[2]);
      expect(result.compras).toEqual(mockAccounts[3]);
      expect(result.igv).toEqual(mockAccounts[4]);
      expect(result.costoVentas).toEqual(mockAccounts[5]);
      expect(result.mercaderias).toEqual(mockAccounts[6]);
    });

    it('should handle missing common accounts gracefully', async () => {
      const mockAccounts = [
        { id: 1, code: '10', name: 'Caja' },
        { id: 3, code: '70', name: 'Ventas' },
      ];

      jest.spyOn(prisma.account, 'findMany').mockResolvedValue(mockAccounts as any);

      const result = await service.getCommonAccounts(mockTenant);

      expect(result.caja).toEqual(mockAccounts[0]);
      expect(result.ventas).toEqual(mockAccounts[1]);
      expect(result.banco).toBeUndefined();
      expect(result.compras).toBeUndefined();
    });

    it('should return empty object if tenant is invalid', async () => {
      const result = await service.getCommonAccounts(null);

      expect(result).toEqual({});
    });
  });
});
