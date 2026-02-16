import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntityOwnershipGuard } from './entity-ownership.guard';

describe('EntityOwnershipGuard', () => {
  let guard: EntityOwnershipGuard;
  let prisma: PrismaService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityOwnershipGuard,
        {
          provide: PrismaService,
          useValue: {
            sales: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<EntityOwnershipGuard>(EntityOwnershipGuard);
    prisma = module.get<PrismaService>(PrismaService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        params: { id: '123' },
        tenantContext: {
          organizationId: 1,
          companyId: 10,
        },
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
      } as any;
    });

    it('should allow access when entity belongs to tenant', async () => {
      jest.spyOn(reflector, 'get')
        .mockReturnValueOnce('sales')  // entityModel
        .mockReturnValueOnce('id');     // entityIdParam

      jest.spyOn(prisma.sales, 'findFirst').mockResolvedValue({ id: 123 });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(prisma.sales.findFirst).toHaveBeenCalledWith({
        where: {
          id: 123,
          organizationId: 1,
          companyId: 10,
        },
        select: { id: true },
      });
    });

    it('should throw ForbiddenException when entity exists in other tenant', async () => {
      jest.spyOn(reflector, 'get')
        .mockReturnValueOnce('sales')
        .mockReturnValueOnce('id');

      // No encontrado con tenant filter
      jest.spyOn(prisma.sales, 'findFirst').mockResolvedValue(null);

      // Pero existe globalmente
      jest.spyOn(prisma.sales, 'findUnique').mockResolvedValue({ id: 123 });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'El recurso sales#123 no pertenece a esta organización.',
      );
    });

    it('should throw NotFoundException when entity does not exist at all', async () => {
      jest.spyOn(reflector, 'get')
        .mockReturnValueOnce('sales')
        .mockReturnValueOnce('id');

      jest.spyOn(prisma.sales, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.sales, 'findUnique').mockResolvedValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        NotFoundException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'sales con ID 123 no encontrado.',
      );
    });

    it('should skip guard when no metadata is set', async () => {
      jest.spyOn(reflector, 'get')
        .mockReturnValueOnce(undefined)  // no entityModel
        .mockReturnValueOnce(undefined); // no entityIdParam

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(prisma.sales.findFirst).not.toHaveBeenCalled();
    });

    it('should work with string IDs (for UUIDs)', async () => {
      mockRequest.params.id = 'uuid-123-abc';

      jest.spyOn(reflector, 'get')
        .mockReturnValueOnce('sales')
        .mockReturnValueOnce('id');

      jest.spyOn(prisma.sales, 'findFirst').mockResolvedValue({ id: 'uuid-123-abc' });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(prisma.sales.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'uuid-123-abc', // Mantiene como string
          organizationId: 1,
          companyId: 10,
        },
        select: { id: true },
      });
    });
  });
});
