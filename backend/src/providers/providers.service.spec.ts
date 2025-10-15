import { ProvidersService } from './providers.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { AuditAction } from '@prisma/client';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

type PrismaMock = PrismaService & {
  provider: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  entry: {
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('ProvidersService multi-organization support', () => {
  const activityServiceMock = {
    log: jest.fn(),
  } as unknown as ActivityService;

  const prismaMock = {
    provider: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    entry: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaMock;

  const baseProvider = {
    name: 'ACME Supplies',
    document: 'RUC',
    documentNumber: '12345678901',
    description: 'Primary supplier',
    phone: '999999999',
    adress: 'Main street 123',
    email: 'contact@acme.com',
    website: 'https://acme.com',
    status: 'ACTIVE',
  };

  let service: ProvidersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProvidersService(prismaMock, activityServiceMock);
  });

  it('filters providers by organizationId when provided', async () => {
    prismaMock.provider.findMany.mockResolvedValue([{ id: 1 }]);

    await service.findAll({ organizationId: 99 });

    expect(prismaMock.provider.findMany).toHaveBeenCalledWith({
      where: { organizationId: 99 },
    });
  });

  it('keeps legacy providers accessible when organizationId is null', async () => {
    prismaMock.provider.findMany.mockResolvedValue([{ id: 2 }]);

    await service.findAll({ organizationId: null });

    expect(prismaMock.provider.findMany).toHaveBeenCalledWith({
      where: { organizationId: null },
    });
  });

  it('returns all providers when no organization context is provided', async () => {
    prismaMock.provider.findMany.mockResolvedValue([{ id: 3 }]);

    await service.findAll();

    expect(prismaMock.provider.findMany).toHaveBeenCalledWith({ where: {} });
  });

  it('persists the provided organizationId on creation and logs the context', async () => {
    prismaMock.provider.create.mockResolvedValue({
      id: 1,
      ...baseProvider,
      organizationId: 101,
    });

    const result = await service.create(
      {
        ...baseProvider,
        organizationId: 101,
      } as any,
      { user: { userId: 5, username: 'ops@tenant' } } as any,
    );

    expect(prismaMock.provider.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: baseProvider.name,
        organizationId: 101,
      }),
    });
    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({
        service: ProvidersService.name,
        operation: 'create',
        organizationId: 101,
        metadata: expect.objectContaining({ providerName: baseProvider.name }),
      }),
    );
    expect(activityServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.CREATED,
        entityType: 'Provider',
      }),
      expect.anything(),
    );
    expect((result as any).organizationId).toBe(101);
  });

  it('stores organizationId as null when omitted to preserve legacy behaviour', async () => {
    prismaMock.provider.create.mockResolvedValue({
      id: 2,
      ...baseProvider,
      organizationId: null,
    });

    await service.create(baseProvider as any);

    expect(prismaMock.provider.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: null,
      }),
    });
    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'create',
        organizationId: undefined,
      }),
    );
  });

  it('allows updating the organizationId of a provider explicitly', async () => {
    prismaMock.provider.findUnique.mockResolvedValueOnce({
      id: 10,
      ...baseProvider,
      organizationId: null,
    });
    prismaMock.provider.update.mockResolvedValue({
      id: 10,
      ...baseProvider,
      organizationId: 303,
    });

    const updated = await service.update(
      10,
      {
        id: 10,
        status: 'ACTIVE',
        organizationId: 303,
      } as any,
    );

    expect(prismaMock.provider.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: expect.objectContaining({ organizationId: 303 }),
    });
    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'update',
        organizationId: 303,
        metadata: { providerId: 10 },
      }),
    );
    expect((updated as any).organizationId).toBe(303);
  });

  it('keeps organizationId untouched on bulk updates when not provided', async () => {
    prismaMock.provider.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      ...baseProvider,
      ...data,
    }));
    prismaMock.$transaction.mockImplementation(async (operations: Promise<any>[]) =>
      Promise.all(operations),
    );

    await service.updateMany(
      [
        { id: 1, status: 'ACTIVE', organizationId: 404 } as any,
        { id: 2, status: 'INACTIVE' } as any,
      ],
      { user: { userId: 1, username: 'bulk@tenant' } } as any,
    );

    expect(prismaMock.provider.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ organizationId: 404 }),
      }),
    );
    expect(prismaMock.provider.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 2 },
        data: expect.not.objectContaining({ organizationId: expect.anything() }),
      }),
    );

    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'updateMany',
        organizationId: 404,
        metadata: { providerId: 1 },
      }),
    );
    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'updateMany',
        organizationId: undefined,
        metadata: { providerId: 2 },
      }),
    );
  });
});