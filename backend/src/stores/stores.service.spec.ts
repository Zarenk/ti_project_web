import { Request } from 'express';
import { StoresService } from './stores.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';

type PrismaMock = {
  store: {
    create: jest.Mock;
    update: jest.Mock;
    findUnique: jest.Mock;
  };
  $transaction: jest.Mock;
};

const createPrismaMock = (): PrismaMock => ({
  store: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
    Promise.all(operations),
  ),
});

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('propagates organizationId when creating a store', async () => {
    prisma.store.create.mockResolvedValue({ id: 1 });

    await service.create(
      {
        ...baseStorePayload,
        organizationId: 75,
      },
      request,
    );

    expect(prisma.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 75 }),
      }),
    );
    expect(activityService.log).toHaveBeenCalled();
  });

  it('defaults organizationId to null when creating a store without tenant context', async () => {
    prisma.store.create.mockResolvedValue({ id: 2 });

    await service.create(
      {
        ...baseStorePayload,
        organizationId: null,
      },
      request,
    );

    expect(prisma.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );
  });

  it('propagates organizationId when updating a store', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: 4,
      ...baseStorePayload,
      organizationId: null,
    });
    prisma.store.update.mockResolvedValue({
      id: 4,
      ...baseStorePayload,
      organizationId: 88,
    });

    await service.update(
      4,
      {
        id: 4,
        name: 'Updated Store',
        organizationId: 88,
      },
      request,
    );

    expect(prisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 88 }),
      }),
    );
  });

  it('ensures updateMany assigns organizationId per store and defaults to null when missing', async () => {
    prisma.store.update.mockImplementation(({ where, data }) =>
      Promise.resolve({ id: where.id, ...data }),
    );

    const result = await service.updateMany(
      [
        {
          id: 5,
          name: 'Store A',
          organizationId: 55,
        },
        {
          id: 6,
          name: 'Store B',
        },
      ],
      request,
    );

    expect(prisma.store.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ organizationId: 55 }),
      }),
    );
    expect(prisma.store.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 6 },
        data: expect.objectContaining({ organizationId: null }),
      }),
    );
    expect(activityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: '2 tienda(s) actualizada(s)',
      }),
      request,
    );
    expect(result).toEqual(
      expect.objectContaining({
        updatedStores: expect.arrayContaining([
          expect.objectContaining({ organizationId: 55 }),
          expect.objectContaining({ organizationId: null }),
        ]),
      }),
    );
  });
});