import { BadRequestException } from '@nestjs/common';
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
    findFirst: jest.Mock;
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
      findFirst: jest.fn(),
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
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    service = new ProvidersService(prismaMock, activityServiceMock);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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

  it('scopes lookups by organization when provided', async () => {
    prismaMock.provider.findFirst.mockResolvedValue({
      id: 42,
      ...baseProvider,
      organizationId: 777,
    });

    await service.findOne(42, 777);

    expect(prismaMock.provider.findFirst).toHaveBeenCalledWith({
      where: { id: 42, organizationId: 777 },
    });
  });

  it('throws when updating a provider from another organization', async () => {
    prismaMock.provider.findFirst.mockResolvedValueOnce({
      id: 99,
      ...baseProvider,
      organizationId: 200,
    });

    await expect(
      service.update(
        99,
        { id: 99, status: 'ACTIVE' } as any,
        undefined,
        999,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows updating the organizationId of a provider explicitly', async () => {
    prismaMock.provider.findFirst.mockResolvedValueOnce({
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

  it('scopes deletions to the tenant context', async () => {
    prismaMock.provider.findFirst.mockResolvedValueOnce({
      id: 5,
      ...baseProvider,
      organizationId: 33,
    });
    prismaMock.entry.findMany.mockResolvedValueOnce([]);
    prismaMock.provider.delete.mockResolvedValue({
      id: 5,
      ...baseProvider,
      organizationId: 33,
    });

    await service.remove(5, undefined, 33);

    expect(prismaMock.provider.findFirst).toHaveBeenCalledWith({
      where: { id: 5, organizationId: 33 },
    });
    expect(prismaMock.provider.delete).toHaveBeenCalledWith({
      where: { id: 5 },
    });
  });

  it('filters bulk deletions by organization', async () => {
    prismaMock.entry.findMany.mockResolvedValue([]);
    prismaMock.provider.findMany.mockResolvedValueOnce([
      { id: 8, organizationId: 77 },
    ]);
    prismaMock.provider.deleteMany.mockResolvedValue({ count: 1 });

    await service.removes([8], undefined, 77);

    expect(prismaMock.provider.findMany).toHaveBeenCalledWith({
      where: { id: { in: [8] }, organizationId: 77 },
    });
    expect(prismaMock.provider.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [8] }, organizationId: 77 },
    });
    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'removeMany',
        organizationId: 77,
      }),
    );
  });

  it('keeps organizationId untouched on bulk updates when not provided', async () => {
    prismaMock.provider.findMany.mockResolvedValueOnce([
      { id: 1, organizationId: 404 },
      { id: 2, organizationId: null },
    ]);
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
        organizationId: null,
        metadata: { providerId: 2 },
      }),
    );
  });

  it('scopes bulk updates to the tenant context', async () => {
    prismaMock.provider.findMany.mockResolvedValueOnce([
      { id: 7, organizationId: 55 },
    ]);
    prismaMock.provider.update.mockResolvedValue({ id: 7, ...baseProvider, organizationId: 55 });

    await service.updateMany(
      [{ id: 7, status: 'ACTIVE' } as any],
      undefined,
      55,
    );

    expect(prismaMock.provider.findMany).toHaveBeenCalledWith({
      where: { id: { in: [7] }, organizationId: 55 },
    });
  });
  
});