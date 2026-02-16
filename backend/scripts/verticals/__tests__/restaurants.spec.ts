import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import {
  createRestaurantTables,
  createKitchenStations,
} from '../restaurants';
import { VerticalScriptContext } from '../index';

describe('Restaurants Vertical Migration Scripts', () => {
  let prismaMock: DeepMockProxy<PrismaClient>;
  let ctx: VerticalScriptContext;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    ctx = {
      prisma: prismaMock as unknown as PrismaClient,
      companyId: 123,
      organizationId: 456,
    };
  });

  afterEach(() => {
    mockReset(prismaMock);
  });

  describe('createRestaurantTables', () => {
    it('should create 5 default tables when none exist', async () => {
      // Arrange
      prismaMock.restaurantTable.count.mockResolvedValue(0);
      prismaMock.restaurantTable.createMany.mockResolvedValue({ count: 5 });

      // Act
      await createRestaurantTables(ctx);

      // Assert
      expect(prismaMock.restaurantTable.count).toHaveBeenCalledWith({
        where: { companyId: 123 },
      });
      expect(prismaMock.restaurantTable.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            code: 'M1',
            name: 'Mesa 1',
            capacity: 2,
            area: 'Principal',
            companyId: 123,
            status: 'AVAILABLE',
          }),
          expect.objectContaining({
            code: 'M5',
            name: 'Mesa 5',
            capacity: 8,
            area: 'Terraza',
            companyId: 123,
            status: 'AVAILABLE',
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should skip creation when tables already exist (idempotency)', async () => {
      // Arrange
      prismaMock.restaurantTable.count.mockResolvedValue(3);

      // Act
      await createRestaurantTables(ctx);

      // Assert
      expect(prismaMock.restaurantTable.count).toHaveBeenCalled();
      expect(prismaMock.restaurantTable.createMany).not.toHaveBeenCalled();
    });

    it('should skip when prisma is missing', async () => {
      // Arrange
      const invalidCtx: VerticalScriptContext = {
        prisma: null as any,
        companyId: 123,
        organizationId: 456,
      };

      // Act
      await createRestaurantTables(invalidCtx);

      // Assert
      expect(prismaMock.restaurantTable.count).not.toHaveBeenCalled();
    });

    it('should skip when companyId is missing', async () => {
      // Arrange
      const invalidCtx: VerticalScriptContext = {
        prisma: prismaMock as unknown as PrismaClient,
        companyId: null as any,
        organizationId: 456,
      };

      // Act
      await createRestaurantTables(invalidCtx);

      // Assert
      expect(prismaMock.restaurantTable.count).not.toHaveBeenCalled();
    });

    it('should create tables with correct structure', async () => {
      // Arrange
      prismaMock.restaurantTable.count.mockResolvedValue(0);
      prismaMock.restaurantTable.createMany.mockResolvedValue({ count: 5 });

      // Act
      await createRestaurantTables(ctx);

      // Assert
      const createCall =
        prismaMock.restaurantTable.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      expect(Array.isArray(createCall?.data)).toBe(true);
      const data = createCall?.data as any[];
      expect(data).toHaveLength(5);
      data.forEach((table: any) => {
        expect(table).toHaveProperty('code');
        expect(table).toHaveProperty('name');
        expect(table).toHaveProperty('capacity');
        expect(table).toHaveProperty('area');
        expect(table).toHaveProperty('companyId', 123);
        expect(table).toHaveProperty('status', 'AVAILABLE');
      });
    });
  });

  describe('createKitchenStations', () => {
    it('should create 4 default kitchen stations when none exist', async () => {
      // Arrange
      prismaMock.kitchenStation.count.mockResolvedValue(0);
      prismaMock.kitchenStation.createMany.mockResolvedValue({ count: 4 });

      // Act
      await createKitchenStations(ctx);

      // Assert
      expect(prismaMock.kitchenStation.count).toHaveBeenCalledWith({
        where: { companyId: 123 },
      });
      expect(prismaMock.kitchenStation.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            code: 'GRILL',
            name: 'Grill',
            companyId: 123,
            isActive: true,
          }),
          expect.objectContaining({
            code: 'PASTRY',
            name: 'Pastry',
            companyId: 123,
            isActive: true,
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should skip creation when stations already exist (idempotency)', async () => {
      // Arrange
      prismaMock.kitchenStation.count.mockResolvedValue(2);

      // Act
      await createKitchenStations(ctx);

      // Assert
      expect(prismaMock.kitchenStation.count).toHaveBeenCalled();
      expect(prismaMock.kitchenStation.createMany).not.toHaveBeenCalled();
    });

    it('should skip when prisma is missing', async () => {
      // Arrange
      const invalidCtx: VerticalScriptContext = {
        prisma: null as any,
        companyId: 123,
        organizationId: 456,
      };

      // Act
      await createKitchenStations(invalidCtx);

      // Assert
      expect(prismaMock.kitchenStation.count).not.toHaveBeenCalled();
    });

    it('should create all 4 station types', async () => {
      // Arrange
      prismaMock.kitchenStation.count.mockResolvedValue(0);
      prismaMock.kitchenStation.createMany.mockResolvedValue({ count: 4 });

      // Act
      await createKitchenStations(ctx);

      // Assert
      const createCall =
        prismaMock.kitchenStation.createMany.mock.calls[0]?.[0];
      expect(createCall).toBeDefined();
      const data = createCall?.data as any[];
      const stationCodes = data.map((s: any) => s.code);
      expect(stationCodes).toContain('GRILL');
      expect(stationCodes).toContain('COLD');
      expect(stationCodes).toContain('BAR');
      expect(stationCodes).toContain('PASTRY');
    });
  });
});
