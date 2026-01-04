import { NotFoundException } from '@nestjs/common';
import { VerticalConfigService } from './vertical-config.service';
import { BusinessVertical } from 'src/types/business-vertical.enum';
import { VERTICAL_REGISTRY } from 'src/config/verticals.config';

describe('VerticalConfigService', () => {
  const createPrismaMock = () => ({
    organization: {
      findUnique: jest.fn(),
    },
    organizationVerticalOverride: {
      findUnique: jest.fn(),
    },
  });

  const createEventsMock = () => ({
    emitConfigInvalidated: jest.fn(),
  });

  const createService = (
    prismaMock = createPrismaMock(),
    eventsMock = createEventsMock(),
  ) => ({
    service: new VerticalConfigService(prismaMock as any, eventsMock as any),
    prisma: prismaMock,
    events: eventsMock,
  });

  it('returns the registry configuration for the organization vertical', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      id: 1,
      businessVertical: BusinessVertical.RETAIL,
      productSchemaEnforced: false,
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
    const { service } = createService(prisma);

    const config = await service.getConfig(1);

    expect(config).toEqual({
      ...VERTICAL_REGISTRY[BusinessVertical.RETAIL],
      enforcedProductSchema: false,
    });
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        id: true,
        businessVertical: true,
        productSchemaEnforced: true,
        updatedAt: true,
      },
    });
  });

  it('reuses the cached configuration once it is stored in memory', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      id: 1,
      businessVertical: BusinessVertical.GENERAL,
      productSchemaEnforced: false,
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
    prisma.organizationVerticalOverride.findUnique.mockResolvedValue(null);
    const { service } = createService(prisma);

    await service.getConfig(1);
    await service.getConfig(1);

    expect(prisma.organization.findUnique).toHaveBeenCalledTimes(1);
    expect(
      prisma.organizationVerticalOverride.findUnique,
    ).toHaveBeenCalledTimes(1);
  });

  it('throws when the organization cannot be found', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue(null);
    const { service } = createService(prisma);

    await expect(service.getConfig(500)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('invalidates the cache (memory + events) when requested', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      id: 2,
      businessVertical: BusinessVertical.GENERAL,
      productSchemaEnforced: false,
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
    const { service, events } = createService(prisma);

    await service.getConfig(2);
    service.invalidateCache(2);
    await service.getConfig(2);

    expect(events.emitConfigInvalidated).toHaveBeenCalledWith({
      organizationId: 2,
    });
    expect(
      prisma.organizationVerticalOverride.findUnique,
    ).toHaveBeenCalledTimes(2);
  });

  it('merges overrides including ui, fiscal, and product schema', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      id: 3,
      businessVertical: BusinessVertical.RETAIL,
      productSchemaEnforced: true,
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
    prisma.organizationVerticalOverride.findUnique.mockResolvedValue({
      configJson: {
        ui: {
          primaryColor: '#000000',
        },
        fiscal: {
          invoiceFormat: 'simplified',
          taxCalculation: 'retail',
        },
        productSchema: {
          fields: [
            {
              key: 'custom',
              label: 'Personalizado',
              type: 'text',
            },
          ],
        },
      },
    });
    const { service } = createService(prisma);

    const config = await service.getConfig(3);

    expect(config.ui.primaryColor).toBe('#000000');
    expect(config.fiscal.invoiceFormat).toBe('simplified');
    expect(config.productSchema.fields).toEqual([
      {
        key: 'custom',
        label: 'Personalizado',
        type: 'text',
      },
    ]);
    expect(config.enforcedProductSchema).toBe(true);
  });

  it('exposes helpers to read enabled features', async () => {
    const prisma = createPrismaMock();
    prisma.organization.findUnique.mockResolvedValue({
      id: 9,
      businessVertical: BusinessVertical.RETAIL,
      productSchemaEnforced: false,
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
    prisma.organizationVerticalOverride.findUnique.mockResolvedValue(null);
    const { service } = createService(prisma);

    const features = await service.getFeatures(9);
    expect(features.sales).toBe(true);
    expect(await service.isFeatureEnabled(9, 'sales')).toBe(true);
  });
});
