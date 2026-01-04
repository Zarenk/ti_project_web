import { VerticalCompatibilityService } from './vertical-compatibility.service';
import { BusinessVertical } from 'src/types/business-vertical.enum';
import { Prisma } from '@prisma/client';

describe('VerticalCompatibilityService', () => {
  const createPrismaMock = (counts: {
    products?: number;
    legacy?: number;
    inventory?: number;
    orders?: number;
    posSales?: number;
    cashRegisters?: number;
    productionProcesses?: number;
    siteSettingsData?: Prisma.JsonObject;
    organizationPreferences?: Prisma.JsonObject;
  }) => {
    const productCount = jest.fn().mockImplementation((args) => {
      if (args?.where?.OR) {
        return Promise.resolve(counts.legacy ?? 0);
      }
      return Promise.resolve(counts.products ?? 0);
    });

    return {
      product: { count: productCount },
      inventory: {
        count: jest.fn().mockResolvedValue(counts.inventory ?? 0),
      },
      orders: {
        count: jest.fn().mockResolvedValue(counts.orders ?? 0),
      },
      sales: {
        count: jest.fn().mockResolvedValue(counts.posSales ?? 0),
      },
      cashRegister: {
        count: jest.fn().mockResolvedValue(counts.cashRegisters ?? 0),
      },
      inventoryHistory: {
        count: jest.fn().mockResolvedValue(counts.productionProcesses ?? 0),
      },
      siteSettings: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            counts.siteSettingsData ? { data: counts.siteSettingsData } : null,
          ),
      },
      organizationSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            counts.organizationPreferences
              ? { preferences: counts.organizationPreferences }
              : null,
          ),
      },
    };
  };

  it('warns when attempting to switch to the same vertical', async () => {
    const prisma = createPrismaMock({});
    const service = new VerticalCompatibilityService(prisma as any);

    const result = await service.check(
      1,
      BusinessVertical.GENERAL,
      BusinessVertical.GENERAL,
    );

    expect(result.isCompatible).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.requiresMigration).toBe(false);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ya utiliza este vertical'),
      ]),
    );
  });

  it('adds retail warning when legacy products exist', async () => {
    const prisma = createPrismaMock({ products: 15, legacy: 10 });
    const service = new VerticalCompatibilityService(prisma as any);

    const result = await service.check(
      5,
      BusinessVertical.GENERAL,
      BusinessVertical.RETAIL,
    );

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('productos sin variantes'),
      ]),
    );
    expect(result.requiresMigration).toBe(true);
    expect(result.affectedModules).toEqual(
      expect.arrayContaining(['inventory', 'sales']),
    );
    expect(result.dataImpact.tables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'products',
          willBeMigrated: true,
        }),
      ]),
    );
  });

  it('blocks restaurant migration if there are pending orders', async () => {
    const prisma = createPrismaMock({
      products: 5,
      legacy: 0,
      inventory: 1,
      orders: 3,
    });
    const service = new VerticalCompatibilityService(prisma as any);

    const result = await service.check(
      9,
      BusinessVertical.RESTAURANTS,
      BusinessVertical.RETAIL,
    );

    expect(result.isCompatible).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('órdenes activas'),
      ]),
    );
    expect(result.affectedModules).toEqual(
      expect.arrayContaining(['kitchenDisplay', 'tableManagement']),
    );
    expect(result.requiresMigration).toBe(true);
  });

  it('detects integrations, permissions and custom fields', async () => {
    const prisma = createPrismaMock({
      siteSettingsData: {
        integrations: {
          gaId: 'G-12345',
          metaPixelId: '',
          loadOnCookieAccept: true,
        },
        permissions: {
          inventory: true,
          catalog: false,
        },
        customFields: [
          { entity: 'product', field: 'custom_attr' },
        ],
      },
    });
    const service = new VerticalCompatibilityService(prisma as any);

    const result = await service.check(
      8,
      BusinessVertical.GENERAL,
      BusinessVertical.RETAIL,
    );

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Integraciones activas detectadas'),
        expect.stringContaining('módulos habilitados'),
      ]),
    );
    expect(result.affectedModules).toEqual(
      expect.arrayContaining(['inventory']),
    );
    expect(result.dataImpact.customFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'custom_attr' }),
      ]),
    );
    expect(result.dataImpact.integrations).toEqual(
      expect.arrayContaining(['gaId', 'loadOnCookieAccept']),
    );
    expect(result.requiresMigration).toBe(true);
  });

  it('warns when recent POS sales or production processes exist', async () => {
    const prisma = createPrismaMock({
      products: 0,
      posSales: 4,
      cashRegisters: 2,
      productionProcesses: 3,
    });
    const service = new VerticalCompatibilityService(prisma as any);

    const result = await service.check(
      11,
      BusinessVertical.GENERAL,
      BusinessVertical.RETAIL,
    );

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ventas POS recientes'),
        expect.stringContaining('cajas activas'),
        expect.stringContaining('procesos de producción'),
      ]),
    );
    expect(result.affectedModules).toEqual(
      expect.arrayContaining(['sales', 'cashregister', 'production']),
    );
    expect(result.requiresMigration).toBe(true);
  });
});
