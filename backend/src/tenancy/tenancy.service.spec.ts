import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import {
  CreateTenancyDto,
  OrganizationUnitInputDto,
} from './dto/create-tenancy.dto';
import { TenancyService } from './tenancy.service';

interface MockTransactionClient {
  organization: {
    create: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  organizationUnit: {
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    findMany: jest.Mock;
  };
  organizationMembership: {
    count: jest.Mock;
  };
}

describe('TenancyService', () => {
  let service: TenancyService;
  let prisma: {
    $transaction: jest.Mock;
    organization: MockTransactionClient['organization'];
    organizationUnit: MockTransactionClient['organizationUnit'];
    organizationMembership: MockTransactionClient['organizationMembership'];
  };
  let tx: MockTransactionClient;

  beforeEach(() => {
    tx = {
      organization: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      organizationUnit: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      organizationMembership: {
        count: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn(async (callback) => callback(tx as unknown as any)),
      organization: tx.organization,
      organizationUnit: tx.organizationUnit,
      organizationMembership: tx.organizationMembership,
    };

    service = new TenancyService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates an organization with a default unit when none is provided', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-01T01:00:00.000Z');

    tx.organization.create.mockResolvedValue({
      id: 10,
      name: 'Acme Corp',
      code: null,
      status: 'ACTIVE',
      createdAt,
      updatedAt,
    });
    tx.organizationUnit.create.mockResolvedValue({
      id: 20,
      organizationId: 10,
      name: 'General',
      code: null,
      parentUnitId: null,
      status: 'ACTIVE',
      createdAt,
      updatedAt,
    });
    tx.organizationMembership.count.mockResolvedValue(0);

    const result = await service.create({ name: 'Acme Corp' });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.organization.create).toHaveBeenCalledWith({
      data: {
        name: 'Acme Corp',
        code: null,
        status: 'ACTIVE',
      },
    });
    expect(tx.organizationUnit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'General',
        organizationId: 10,
        parentUnitId: null,
        status: 'ACTIVE',
      }),
    });
    expect(result).toEqual({
      id: 10,
      name: 'Acme Corp',
      code: null,
      status: 'ACTIVE',
      createdAt,
      updatedAt,
      units: [
        expect.objectContaining({
          name: 'General',
          organizationId: 10,
        }),
      ],
      membershipCount: 0,
    });
  });

  it('creates hierarchical units using parent codes', async () => {
    const createdAt = new Date('2024-02-01T00:00:00.000Z');
    const updatedAt = new Date('2024-02-01T01:00:00.000Z');

    tx.organization.create.mockResolvedValue({
      id: 55,
      name: 'Globex',
      code: 'GBX',
      status: 'ACTIVE',
      createdAt,
      updatedAt,
    });
    tx.organizationMembership.count.mockResolvedValue(0);
    tx.organizationUnit.create.mockResolvedValueOnce({
      id: 101,
      organizationId: 55,
      name: 'Headquarters',
      code: 'hq',
      parentUnitId: null,
      status: 'ACTIVE',
      createdAt,
      updatedAt,
    });
    tx.organizationUnit.create.mockResolvedValueOnce({
      id: 102,
      organizationId: 55,
      name: 'Store Lima',
      code: 'store-lim',
      parentUnitId: 101,
      status: 'ACTIVE',
      createdAt,
      updatedAt,
    });

    const payload: CreateTenancyDto = {
      name: 'Globex',
      code: 'GBX',
      units: [
        { name: 'Headquarters', code: 'hq' },
        { name: 'Store Lima', code: 'store-lim', parentCode: 'hq' },
      ],
    };

    const result = await service.create(payload);

    expect(tx.organizationUnit.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ parentUnitId: 101 }),
      }),
    );
    expect(result.units).toHaveLength(2);
    expect(result.membershipCount).toBe(0);
  });

  it('updates organization metadata and units in place', async () => {
    const createdAt = new Date('2024-03-01T00:00:00.000Z');
    const updatedAt = new Date('2024-03-01T01:00:00.000Z');

    tx.organization.update.mockResolvedValue({
      id: 7,
      name: 'Initech Updated',
      code: 'INIT',
      status: 'ACTIVE',
      createdAt,
      updatedAt,
    });

    tx.organizationUnit.findMany.mockResolvedValueOnce([
      {
        id: 21,
        organizationId: 7,
        code: 'root',
        parentUnitId: null,
        name: 'Root',
        status: 'ACTIVE',
        createdAt,
        updatedAt,
      },
      {
        id: 22,
        organizationId: 7,
        code: 'sales',
        parentUnitId: 21,
        name: 'Sales',
        status: 'ACTIVE',
        createdAt,
        updatedAt,
      },
    ]);

    tx.organizationUnit.update.mockResolvedValue({
      id: 22,
      organizationId: 7,
      code: 'sales',
      parentUnitId: 21,
      name: 'Enterprise Sales',
      status: 'INACTIVE',
      createdAt,
      updatedAt,
    });

    tx.organizationUnit.create.mockResolvedValue({
      id: 30,
      organizationId: 7,
      code: 'support',
      parentUnitId: 21,
      name: 'Support',
      status: 'ACTIVE',
      createdAt,
      updatedAt,
    });

    tx.organizationUnit.findMany.mockResolvedValueOnce([
      {
        id: 21,
        organizationId: 7,
        code: 'root',
        parentUnitId: null,
        name: 'Root',
        status: 'ACTIVE',
        createdAt,
        updatedAt,
      },
      {
        id: 22,
        organizationId: 7,
        code: 'sales',
        parentUnitId: 21,
        name: 'Enterprise Sales',
        status: 'INACTIVE',
        createdAt,
        updatedAt,
      },
      {
        id: 30,
        organizationId: 7,
        code: 'support',
        parentUnitId: 21,
        name: 'Support',
        status: 'ACTIVE',
        createdAt,
        updatedAt,
      },
    ]);

    tx.organizationMembership.count.mockResolvedValue(4);

    const updates: OrganizationUnitInputDto[] = [
      { id: 22, name: 'Enterprise Sales', status: 'INACTIVE' },
      { name: 'Support', code: 'support', parentCode: 'root' },
    ];

    const result = await service.update(7, {
      name: 'Initech Updated',
      units: updates,
    });

    expect(tx.organizationUnit.update).toHaveBeenCalledWith({
      where: { id: 22 },
      data: expect.objectContaining({
        name: 'Enterprise Sales',
        status: 'INACTIVE',
      }),
    });
    expect(tx.organizationUnit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ code: 'support', parentUnitId: 21 }),
    });
    expect(result.units).toHaveLength(3);
    expect(result.membershipCount).toBe(4);
  });

  it('deactivates organizations and all units', async () => {
    const createdAt = new Date('2024-04-01T00:00:00.000Z');
    const updatedAt = new Date('2024-04-01T01:00:00.000Z');

    tx.organization.update.mockResolvedValue({
      id: 90,
      name: 'Umbrella',
      code: null,
      status: 'INACTIVE',
      createdAt,
      updatedAt,
    });

    tx.organizationUnit.updateMany.mockResolvedValue({ count: 2 });
    tx.organizationUnit.findMany.mockResolvedValue([
      {
        id: 1,
        organizationId: 90,
        code: null,
        name: 'HQ',
        parentUnitId: null,
        status: 'INACTIVE',
        createdAt,
        updatedAt,
      },
    ]);
    tx.organizationMembership.count.mockResolvedValue(0);

    const result = await service.remove(90);

    expect(tx.organization.update).toHaveBeenCalledWith({
      where: { id: 90 },
      data: { status: 'INACTIVE' },
    });
    expect(tx.organizationUnit.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 90 },
      data: { status: 'INACTIVE' },
    });
    expect(result.status).toBe('INACTIVE');
    expect(result.units[0].status).toBe('INACTIVE');
  });

  it('lists all organizations with unit and membership metadata', async () => {
    const createdAt = new Date('2024-05-01T00:00:00.000Z');
    const updatedAt = new Date('2024-05-01T01:00:00.000Z');

    prisma.organization.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Wayne Enterprises',
        code: 'WAYNE',
        status: 'ACTIVE',
        createdAt,
        updatedAt,
        units: [
          {
            id: 1,
            organizationId: 1,
            name: 'HQ',
            code: null,
            parentUnitId: null,
            status: 'ACTIVE',
            createdAt,
            updatedAt,
          },
        ],
        _count: { memberships: 3 },
      },
    ]);

    const result = await service.findAll();

    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        name: 'Wayne Enterprises',
        membershipCount: 3,
        units: expect.arrayContaining([
          expect.objectContaining({ name: 'HQ' }),
        ]),
      }),
    ]);
  });

  it('retrieves a single organization by id', async () => {
    const createdAt = new Date('2024-05-15T00:00:00.000Z');
    const updatedAt = new Date('2024-05-15T01:00:00.000Z');

    prisma.organization.findUnique.mockResolvedValue({
      id: 44,
      name: 'Stark Industries',
      code: 'STARK',
      status: 'ACTIVE',
      createdAt,
      updatedAt,
      units: [
        {
          id: 5,
          organizationId: 44,
          code: 'iron',
          name: 'Iron Division',
          parentUnitId: null,
          status: 'ACTIVE',
          createdAt,
          updatedAt,
        },
      ],
      _count: { memberships: 12 },
    });

    const result = await service.findOne(44);

    expect(result.id).toBe(44);
    expect(result.membershipCount).toBe(12);
  });

  it('throws when requesting an unknown organization', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(service.findOne(123)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('validates parent codes for new units', async () => {
    tx.organization.create.mockResolvedValue({
      id: 5,
      name: 'Cyberdyne',
      code: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    tx.organizationMembership.count.mockResolvedValue(0);
    tx.organizationUnit.create.mockResolvedValueOnce({
      id: 51,
      organizationId: 5,
      parentUnitId: null,
      name: 'Skynet Core',
      code: 'core',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.create({
        name: 'Cyberdyne',
        units: [
          { name: 'Skynet Core', code: 'core' },
          { name: 'Factory', parentCode: 'unknown' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
