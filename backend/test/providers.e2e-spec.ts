import {
  INestApplication,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ProvidersModule } from '../src/providers/providers.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ActivityService } from '../src/activity/activity.service';
import { TenantContext } from '../src/tenancy/tenant-context.interface';

class HeaderTenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const httpRequest = context.switchToHttp().getRequest();
    const rawHeader = httpRequest.headers['x-org-id'];
    const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    const parsed =
      typeof headerValue === 'string'
        ? Number.parseInt(headerValue, 10)
        : Number.NaN;
    const organizationId = Number.isFinite(parsed) ? parsed : null;

    const tenantContext: TenantContext = {
      organizationId,
      companyId: null,
      organizationUnitId: null,
      userId: null,
      isGlobalSuperAdmin: false,
      isOrganizationSuperAdmin: false,
      isSuperAdmin: false,
      allowedOrganizationIds: organizationId ? [organizationId] : [],
      allowedCompanyIds: [],
      allowedOrganizationUnitIds: [],
    };

    httpRequest.tenantContext = tenantContext;

    return true;
  }
}

describe('ProvidersController multi-tenant boundaries (e2e)', () => {
  let app: INestApplication;

  const providerAlpha = {
    id: 101,
    name: 'Alpha Supplies',
    document: 'RUC',
    documentNumber: '20123456789',
    status: 'ACTIVE',
    organizationId: 1,
  };
  const providerBeta = {
    id: 202,
    name: 'Beta Imports',
    document: 'RUC',
    documentNumber: '20987654321',
    status: 'ACTIVE',
    organizationId: 2,
  };
  const providerLegacy = {
    id: 303,
    name: 'Legacy Provider',
    document: 'RUC',
    documentNumber: '20000000000',
    status: 'ACTIVE',
    organizationId: null,
  };

  const dataset = [providerAlpha, providerBeta, providerLegacy];

  const findManyMock = jest.fn(
    async ({ where }: { where?: { organizationId?: number | null } }) => {
      if (!where || typeof where.organizationId === 'undefined') {
        return dataset.map((item) => ({ ...item }));
      }

      return dataset
        .filter((provider) => provider.organizationId === where.organizationId)
        .map((item) => ({ ...item }));
    },
  );

  const findFirstMock = jest.fn(async ({ where }: { where?: any }) => {
    const { id, documentNumber, organizationId } = where ?? {};

    return (
      dataset.find((provider) => {
        const matchesId = typeof id === 'undefined' || provider.id === id;
        const matchesDocument =
          typeof documentNumber === 'undefined' ||
          provider.documentNumber === documentNumber;
        const matchesOrganization =
          typeof organizationId === 'undefined'
            ? true
            : organizationId === null
              ? provider.organizationId === null
              : provider.organizationId === organizationId;

        return matchesId && matchesDocument && matchesOrganization;
      }) ?? null
    );
  });

  const prismaStub = {
    provider: {
      findMany: findManyMock,
      findFirst: findFirstMock,
    },
  } as unknown as PrismaService;

  const activityStub = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as ActivityService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProvidersModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(ActivityService)
      .useValue(activityStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalGuards(new HeaderTenantContextGuard());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    findManyMock.mockClear();
    findFirstMock.mockClear();
  });

  it('scopes provider listing by the tenant header', async () => {
    const response = await request(app.getHttpServer())
      .get('/providers')
      .set('x-org-id', '1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ id: providerAlpha.id, organizationId: 1 }),
    ]);

    expect(findManyMock).toHaveBeenCalledWith({ where: { organizationId: 1 } });
  });

  it('returns legacy providers when no tenant is resolved', async () => {
    const response = await request(app.getHttpServer()).get('/providers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ id: providerLegacy.id, organizationId: null }),
    ]);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { organizationId: null },
    });
  });

  it('rejects cross-tenant provider lookups', async () => {
    const response = await request(app.getHttpServer())
      .get(`/providers/${providerAlpha.id}`)
      .set('x-org-id', '2');

    expect(response.status).toBe(404);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: providerAlpha.id, organizationId: 2 },
    });
  });

  it('returns the provider when the tenant matches', async () => {
    const response = await request(app.getHttpServer())
      .get(`/providers/${providerBeta.id}`)
      .set('x-org-id', '2');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({ id: providerBeta.id }),
    );
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: providerBeta.id, organizationId: 2 },
    });
  });
});
