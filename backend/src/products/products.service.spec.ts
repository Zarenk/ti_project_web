import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';
import { BusinessVertical } from 'src/types/business-vertical.enum';

const createMocks = () => {
  const prisma = {
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
  };
  const categoryService = {
    verifyOrCreateDefaultCategory: jest.fn(),
  };
  const brandsService = {
    findOrCreateByName: jest.fn(),
  };
  const tenantContext = {
    getContext: jest.fn(() => ({ organizationId: 1, companyId: 2 })),
  };
  const verticalConfig = {
    getConfig: jest.fn(),
  };

  return { prisma, categoryService, brandsService, tenantContext, verticalConfig };
};

const createService = () => {
  const mocks = createMocks();
  const service = new ProductsService(
    mocks.prisma as any,
    mocks.categoryService as any,
    mocks.brandsService as any,
    mocks.tenantContext as any,
    mocks.verticalConfig as any,
  );
  return { service, ...mocks };
};

describe('ProductsService - vertical migration helpers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds the legacy filter when requesting products pending migration', async () => {
    const { service, prisma } = createService();
    prisma.product.findMany.mockResolvedValue([]);

    await service.findAll({ migrationStatus: 'legacy' });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { extraAttributes: { equals: Prisma.JsonNull } },
            { isVerticalMigrated: false },
          ],
        }),
      }),
    );
  });

  it('enforces the configured schema for retail organizations', async () => {
    const { service, prisma, verticalConfig } = createService();
    prisma.product.findFirst.mockResolvedValue({
      id: 10,
      extraAttributes: null,
      isVerticalMigrated: false,
    });
    prisma.product.update.mockResolvedValue({});
    verticalConfig.getConfig.mockResolvedValue({
      name: BusinessVertical.RETAIL,
      enforcedProductSchema: true,
      productSchema: {
        fields: [
          { key: 'size', label: 'Talla', type: 'select', required: true, options: ['S', 'M'] },
        ],
      },
    });

    await service.updateProductVerticalMigration(
      10,
      { size: 'S', skuVariant: 'SKU-S' },
      true,
    );

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        extraAttributes: { size: 'S' },
        isVerticalMigrated: true,
      },
    });
  });

  it('throws when the schema is enforced but no attributes are provided', async () => {
    const { service, prisma, verticalConfig } = createService();
    prisma.product.findFirst.mockResolvedValue({
      id: 11,
      extraAttributes: null,
      isVerticalMigrated: false,
    });
    verticalConfig.getConfig.mockResolvedValue({
      name: BusinessVertical.RETAIL,
      enforcedProductSchema: true,
      productSchema: { fields: [] },
    });

    await expect(
      service.updateProductVerticalMigration(
        11,
        undefined as unknown as Record<string, unknown>,
        false,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires attributes before marking a product as migrated', async () => {
    const { service, prisma } = createService();
    prisma.product.findFirst.mockResolvedValue({
      id: 5,
      extraAttributes: null,
      isVerticalMigrated: false,
    });

    await expect(service.markProductVerticalMigrated(5)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    prisma.product.findFirst.mockResolvedValue({
      id: 5,
      extraAttributes: { size: 'M' },
      isVerticalMigrated: false,
    });
    prisma.product.update.mockResolvedValue({ id: 5 });

    await service.markProductVerticalMigrated(5);

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isVerticalMigrated: true },
    });
  });
});
