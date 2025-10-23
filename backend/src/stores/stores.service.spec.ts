import { Request } from 'express';
import { StoresService } from './stores.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

type PrismaMock = {
  store: {
    create: jest.Mock;
    update: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const logOrganizationContextMock =
  logOrganizationContext as unknown as jest.Mock;

const createPrismaMock = (): PrismaMock => {
  const prisma = {
    store: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaMock;

  prisma.$transaction.mockImplementation(async (arg: any) => {
    if (typeof arg === 'function') {
      return arg(prisma as unknown as PrismaService);
    }
    return Promise.all(arg);
  });

  return prisma;
};

const createActivityServiceMock = () => ({
  log: jest.fn().mockResolvedValue(undefined),
});

describe('StoresService multi-organization support', () => {
  let service: StoresService;
  let prisma: PrismaMock;
  let activityService: ReturnType<typeof createActivityServiceMock>;
  let request: Request;

  const baseStorePayload = {
    name: 'Main Store',
    description: null,
    ruc: null,
    phone: null,
    adress: null,
    email: null,
    website: null,
    status: null,
    image: null,
  };

  beforeEach(() => {
    prisma = createPrismaMock();

    activityService = createActivityServiceMock();

    service = new StoresService(
      prisma as unknown as PrismaService,
      activityService as unknown as ActivityService,
    );

    request = {
      user: {
        userId: 10,
        username: 'user@example.com',
      },
    } as unknown as Request;
    logOrganizationContextMock.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('propagates the context organizationId when creating a store', async () => {
    prisma.store.create.mockResolvedValue({ id: 1, name: 'Main Store' });

    await service.create(
      {
        ...baseStorePayload,
        organizationId: null,
      },
      request,
      55,
    );

    expect(prisma.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 55 }),
      }),
    );
    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        service: StoresService.name,
        operation: 'create',
        organizationId: 55,
      }),
    );
    expect(activityService.log).toHaveBeenCalled();
  });

  it('defaults organizationId to null when creating a store without tenant context', async () => {
    prisma.store.create.mockResolvedValue({ id: 2, name: 'Legacy Store' });

    await service.create(
      {
        ...baseStorePayload,
        organizationId: undefined,
      },
      request,
    );

    expect(prisma.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );
    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: null }),
    );
  });

  it('filters stores by organization when listing with tenant context', async () => {
    prisma.store.findMany.mockResolvedValue([{ id: 1 }]);

    await service.findAll(77);

    expect(prisma.store.findMany).toHaveBeenCalledWith({
      where: { organizationId: 77 },
    });
  });

  it('returns all stores when no tenant context is provided', async () => {
    prisma.store.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await service.findAll(undefined);

    expect(prisma.store.findMany).toHaveBeenCalledWith();
  });

  it('scopes store lookup by organizationId when finding one store', async () => {
    prisma.store.findFirst.mockResolvedValue({
      id: 99,
      ...baseStorePayload,
      organizationId: 88,
    });

    await service.findOne(99, 88);

    expect(prisma.store.findFirst).toHaveBeenCalledWith({
      where: { id: 99, organizationId: 88 },
    });
  });

  it('checks for store existence using organization filters', async () => {
    prisma.store.findFirst.mockResolvedValue({ id: 5 });

    const exists = await service.checkIfExists('Main Store', null);

    expect(exists).toBe(true);
    expect(prisma.store.findFirst).toHaveBeenCalledWith({
      where: { name: 'Main Store', organizationId: null },
    });
  });

  it('propagates the organizationId when updating a store within context', async () => {
    prisma.store.findFirst.mockResolvedValue({
      id: 4,
      ...baseStorePayload,
      organizationId: 44,
    });
    prisma.store.update.mockResolvedValue({
      id: 4,
      ...baseStorePayload,
      organizationId: 44,
    });

    await service.update(
      4,
      {
        id: 4,
        name: 'Updated Store',
        organizationId: 99,
      },
      request,
      44,
    );

    expect(prisma.store.findFirst).toHaveBeenCalledWith({
      where: { id: 4, organizationId: 44 },
    });

    expect(prisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 44 }),
      }),
    );
    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'update',
        organizationId: 44,
      }),
    );
  });

  it('throws when updating a store outside the tenant context', async () => {
    prisma.store.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        4,
        {
          id: 4,
          name: 'Updated Store',
        },
        request,
        999,
      ),
    ).rejects.toThrow('Store with id 4 not found');
    expect(prisma.store.update).not.toHaveBeenCalled();
  });

  it('ensures updateMany applies organization context to every store', async () => {
    prisma.store.findFirst
      .mockResolvedValueOnce({ id: 5, organizationId: 44 })
      .mockResolvedValueOnce({ id: 6, organizationId: 44 });
    prisma.store.update.mockImplementation(({ where, data }) =>
      Promise.resolve({ id: where.id, ...data }),
    );

    const result = await service.updateMany(
      [
        {
          id: 5,
          name: 'Store A',
        },
        {
          id: 6,
          name: 'Store B',
        },
      ],
      request,
      44,
    );

    expect(prisma.store.update).toHaveBeenCalledTimes(2);
    expect(prisma.store.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ organizationId: 44 }),
      }),
    );
    expect(prisma.store.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 6 },
        data: expect.objectContaining({ organizationId: 44 }),
      }),
    );
    expect(logOrganizationContextMock).toHaveBeenCalledTimes(2);
    expect(result.updatedStores).toHaveLength(2);
  });

  it('removes a store after validating tenant ownership', async () => {
    prisma.store.findFirst.mockResolvedValue({
      id: 9,
      ...baseStorePayload,
      organizationId: 12,
      name: 'To Delete',
    });
    prisma.store.delete.mockResolvedValue({
      id: 9,
      ...baseStorePayload,
      name: 'To Delete',
    });

    await service.remove(9, request, 12);

    expect(prisma.store.findFirst).toHaveBeenCalledWith({
      where: { id: 9, organizationId: 12 },
    });
    expect(prisma.store.delete).toHaveBeenCalledWith({
      where: { id: 9 },
    });
    expect(activityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('DELETED'),
      }),
      request,
    );
  });

  it('removes multiple stores using the tenant filter', async () => {
    prisma.store.deleteMany.mockResolvedValue({ count: 2 });

    const result = await service.removes([1, 2], request, null);

    expect(prisma.store.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1, 2] },
        organizationId: null,
      },
    });
    expect(result).toEqual({
      message: '2 tienda(s) eliminada(s) correctamente.',
    });
  });
});
