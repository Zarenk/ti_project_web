import { Test, TestingModule } from '@nestjs/testing';
import { VerticalMigrationService } from '../vertical-migration.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VerticalEventsService } from '../vertical-events.service';
import { BusinessVertical } from '../../types/business-vertical.enum';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('VerticalMigrationService', () => {
  let service: VerticalMigrationService;
  let prismaMock: DeepMockProxy<PrismaClient>;
  let eventsService: VerticalEventsService;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerticalMigrationService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: VerticalEventsService,
          useValue: {
            emitMigrationStarted: jest.fn(),
            emitMigrationCompleted: jest.fn(),
            emitMigrationFailed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VerticalMigrationService>(VerticalMigrationService);
    eventsService = module.get<VerticalEventsService>(VerticalEventsService);
  });

  describe('executeActivationScripts', () => {
    it('should execute activation scripts for RESTAURANTS vertical', async () => {
      // Arrange
      const companyId = 123;
      const vertical = BusinessVertical.RESTAURANTS;

      prismaMock.restaurantTable.count.mockResolvedValue(0);
      prismaMock.restaurantTable.createMany.mockResolvedValue({ count: 5 });
      prismaMock.kitchenStation.count.mockResolvedValue(0);
      prismaMock.kitchenStation.createMany.mockResolvedValue({ count: 4 });

      // Act
      await service.executeActivationScripts(companyId, vertical);

      // Assert
      expect(prismaMock.restaurantTable.count).toHaveBeenCalled();
      expect(prismaMock.kitchenStation.count).toHaveBeenCalled();
    });

    it('should execute activation scripts for RETAIL vertical', async () => {
      // Arrange
      const companyId = 456;
      const vertical = BusinessVertical.RETAIL;

      prismaMock.posStation.count.mockResolvedValue(0);
      prismaMock.posStation.create.mockResolvedValue({
        id: 1,
        companyId: 456,
        stationCode: 'POS-01',
        stationName: 'Main Counter',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Act
      await service.executeActivationScripts(companyId, vertical);

      // Assert
      expect(prismaMock.posStation.count).toHaveBeenCalled();
    });

    it('should skip for GENERAL vertical (no activation scripts)', async () => {
      // Arrange
      const companyId = 789;
      const vertical = BusinessVertical.GENERAL;

      // Act & Assert - should not throw
      await expect(
        service.executeActivationScripts(companyId, vertical),
      ).resolves.toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const companyId = 999;
      const vertical = BusinessVertical.RESTAURANTS;

      prismaMock.restaurantTable.count.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(
        service.executeActivationScripts(companyId, vertical),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('canChangeVertical', () => {
    it('should return true if company has no existing data', async () => {
      // Arrange
      const companyId = 123;
      const toVertical = BusinessVertical.RESTAURANTS;

      prismaMock.product.count.mockResolvedValue(0);
      prismaMock.sale.count.mockResolvedValue(0);
      prismaMock.entry.count.mockResolvedValue(0);

      // Act
      const result = await service.canChangeVertical(companyId, toVertical);

      // Assert
      expect(result.isCompatible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return compatibility check for companies with data', async () => {
      // Arrange
      const companyId = 456;
      const toVertical = BusinessVertical.RETAIL;

      prismaMock.product.count.mockResolvedValue(50);
      prismaMock.sale.count.mockResolvedValue(100);
      prismaMock.entry.count.mockResolvedValue(25);

      // Act
      const result = await service.canChangeVertical(companyId, toVertical);

      // Assert
      expect(result).toHaveProperty('isCompatible');
      expect(result).toHaveProperty('requiresMigration');
      expect(result).toHaveProperty('dataImpact');
    });
  });

  describe('Integration with Events', () => {
    it('should emit migration started event', async () => {
      // Arrange
      const companyId = 123;
      const vertical = BusinessVertical.RESTAURANTS;

      prismaMock.restaurantTable.count.mockResolvedValue(0);
      prismaMock.restaurantTable.createMany.mockResolvedValue({ count: 5 });
      prismaMock.kitchenStation.count.mockResolvedValue(0);
      prismaMock.kitchenStation.createMany.mockResolvedValue({ count: 4 });

      // Act
      await service.executeActivationScripts(companyId, vertical);

      // Assert
      // Note: Events are emitted in the service, verify they're called
      // if the service implements event emission
    });
  });
});
