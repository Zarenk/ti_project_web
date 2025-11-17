import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { TenancyModule } from '../src/tenancy/tenancy.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TenancyController multi-tenant fixtures (e2e)', () => {
  let app: INestApplication;

  const baseDate = new Date('2024-01-01T00:00:00.000Z');
  const organizationInclude = {
    units: { orderBy: { id: 'asc' } },
    _count: { select: { memberships: true } },
  };
  const organizationSnapshots = [
    {
      id: 1,
      name: 'Tenant Alpha',
      code: 'tenant-alpha',
      status: 'ACTIVE',
      createdAt: baseDate,
      updatedAt: baseDate,
      units: [
        {
          id: 11,
          organizationId: 1,
          parentUnitId: null,
          name: 'Alpha HQ',
          code: 'alpha-hq',
          status: 'ACTIVE',
          createdAt: baseDate,
          updatedAt: baseDate,
        },
        {
          id: 12,
          organizationId: 1,
          parentUnitId: 11,
          name: 'Alpha Retail',
          code: 'alpha-retail',
          status: 'ACTIVE',
          createdAt: baseDate,
          updatedAt: baseDate,
        },
      ],
      _count: { memberships: 2 },
    },
    {
      id: 2,
      name: 'Tenant Beta',
      code: 'tenant-beta',
      status: 'ACTIVE',
      createdAt: baseDate,
      updatedAt: baseDate,
      units: [
        {
          id: 21,
          organizationId: 2,
          parentUnitId: null,
          name: 'Beta HQ',
          code: 'beta-hq',
          status: 'ACTIVE',
          createdAt: baseDate,
          updatedAt: baseDate,
        },
        {
          id: 22,
          organizationId: 2,
          parentUnitId: 21,
          name: 'Beta Storefront',
          code: 'beta-store',
          status: 'ACTIVE',
          createdAt: baseDate,
          updatedAt: baseDate,
        },
      ],
      _count: { memberships: 1 },
    },
  ];

  const prismaStub = {
    organization: {
      findMany: jest.fn(async () => organizationSnapshots),
      findUnique: jest.fn(
        async ({ where: { id } }) =>
          organizationSnapshots.find(
            (organization) => organization.id === id,
          ) ?? null,
      ),
    },
  } as unknown as PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TenancyModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all seeded organizations with their units', async () => {
    const response = await request(app.getHttpServer()).get('/tenancy');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    const [alpha, beta] = response.body;
    expect(alpha.code).toBe('tenant-alpha');
    expect(alpha.units).toHaveLength(2);
    expect(alpha.membershipCount).toBe(2);

    expect(beta.code).toBe('tenant-beta');
    expect(beta.units[1].code).toBe('beta-store');
    expect(beta.membershipCount).toBe(1);

    expect(
      (prismaStub.organization.findMany as jest.Mock).mock.calls[0][0],
    ).toEqual({
      include: organizationInclude,
      orderBy: { id: 'asc' },
    });
  });

  it('returns a specific organization snapshot with ordered units', async () => {
    const response = await request(app.getHttpServer()).get('/tenancy/2');

    expect(response.status).toBe(200);
    expect(response.body.code).toBe('tenant-beta');
    expect(response.body.units.map((unit: any) => unit.code)).toEqual([
      'beta-hq',
      'beta-store',
    ]);
    expect(response.body.membershipCount).toBe(1);
    expect(
      (prismaStub.organization.findUnique as jest.Mock).mock.calls[0][0],
    ).toEqual({
      where: { id: 2 },
      include: organizationInclude,
    });
  });

  it('responds with 404 when the organization does not exist', async () => {
    const response = await request(app.getHttpServer()).get('/tenancy/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Organization 999');
    expect(
      (prismaStub.organization.findUnique as jest.Mock).mock.calls[0][0],
    ).toEqual({
      where: { id: 999 },
      include: organizationInclude,
    });
  });
});
