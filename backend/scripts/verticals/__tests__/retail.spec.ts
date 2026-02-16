import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import {
  setupPosStations,
  initializeBarcodeSystem,
  createRetailCatalogs,
} from '../retail';
import { VerticalScriptContext } from '../index';

describe('Retail Vertical Migration Scripts', () => {
  let prismaMock: DeepMockProxy<PrismaClient>;
  let ctx: VerticalScriptContext;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    ctx = {
      prisma: prismaMock as unknown as PrismaClient,
      companyId: 789,
      organizationId: 101,
    };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    mockReset(prismaMock);
    consoleSpy.mockRestore();
  });

  describe('setupPosStations', () => {
    it('should create default POS station when none exist', async () => {
      // Arrange
      prismaMock.posStation.count.mockResolvedValue(0);
      prismaMock.posStation.create.mockResolvedValue({
        id: 1,
        companyId: 789,
        stationCode: 'POS-01',
        stationName: 'Main Counter',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Act
      await setupPosStations(ctx);

      // Assert
      expect(prismaMock.posStation.count).toHaveBeenCalledWith({
        where: { companyId: 789 },
      });
      expect(prismaMock.posStation.create).toHaveBeenCalledWith({
        data: {
          companyId: 789,
          stationCode: 'POS-01',
          stationName: 'Main Counter',
          isActive: true,
        },
      });
    });

    it('should skip creation when stations already exist', async () => {
      // Arrange
      prismaMock.posStation.count.mockResolvedValue(1);

      // Act
      await setupPosStations(ctx);

      // Assert
      expect(prismaMock.posStation.count).toHaveBeenCalled();
      expect(prismaMock.posStation.create).not.toHaveBeenCalled();
    });

    it('should skip when prisma is missing', async () => {
      // Arrange
      const invalidCtx: VerticalScriptContext = {
        prisma: null as any,
        companyId: 789,
        organizationId: 101,
      };

      // Act
      await setupPosStations(invalidCtx);

      // Assert
      expect(prismaMock.posStation.count).not.toHaveBeenCalled();
    });
  });

  describe('initializeBarcodeSystem', () => {
    it('should log initialization message', async () => {
      // Act
      await initializeBarcodeSystem(ctx);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Barcode system initialized for company 789'),
      );
    });

    it('should complete successfully even with missing prisma', async () => {
      // Arrange
      const minimalCtx: VerticalScriptContext = {
        prisma: null as any,
        companyId: 789,
        organizationId: 101,
      };

      // Act & Assert - should not throw
      await expect(
        initializeBarcodeSystem(minimalCtx),
      ).resolves.toBeUndefined();
    });
  });

  describe('createRetailCatalogs', () => {
    it('should skip when company already has categories', async () => {
      // Arrange
      prismaMock.category.count.mockResolvedValue(5);

      // Act
      await createRetailCatalogs(ctx);

      // Assert
      expect(prismaMock.category.count).toHaveBeenCalled();
      expect(prismaMock.category.createMany).not.toHaveBeenCalled();
    });

    it('should skip when prisma is missing', async () => {
      // Arrange
      const invalidCtx: VerticalScriptContext = {
        prisma: null as any,
        companyId: 789,
        organizationId: 101,
      };

      // Act
      await createRetailCatalogs(invalidCtx);

      // Assert
      expect(prismaMock.category.count).not.toHaveBeenCalled();
    });
  });
});
