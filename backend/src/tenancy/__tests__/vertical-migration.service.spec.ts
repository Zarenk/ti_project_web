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

  describe('changeVertical', () => {
    it('should execute changeVertical for RESTAURANTS vertical', async () => {
      // Arrange
      const params = {
        companyId: 123,
        organizationId: 1,
        actorId: 1,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RESTAURANTS,
        warnings: [],
      };

      prismaMock.restaurantTable.count.mockResolvedValue(0);
      prismaMock.restaurantTable.createMany.mockResolvedValue({ count: 5 });
      prismaMock.kitchenStation.count.mockResolvedValue(0);
      prismaMock.kitchenStation.createMany.mockResolvedValue({ count: 4 });
      prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));

      // Act & Assert - should not throw (service may call internal scripts)
      await expect(
        (service as any).changeVertical(params),
      ).resolves.not.toThrow?.() ?? true;
    });

    it('should throw when companyId is missing', async () => {
      // Arrange
      const params = {
        actorId: 1,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RETAIL,
        warnings: [],
      };

      // Act & Assert
      await expect(
        (service as any).changeVertical(params),
      ).rejects.toThrow();
    });
  });

  describe('Integration with Events', () => {
    it('should have events service injected', () => {
      expect(eventsService).toBeDefined();
      expect(service).toBeDefined();
    });
  });
});
