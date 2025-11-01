import { ForbiddenException } from '@nestjs/common';
import { AccReportsService } from './acc-reports.service';
import * as queueModule from './acc-reports.queue';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

const baseTenant: TenantContext = {
  organizationId: 1,
  companyId: 10,
  organizationUnitId: null,
  userId: 123,
  isGlobalSuperAdmin: false,
  isOrganizationSuperAdmin: false,
  isSuperAdmin: false,
  allowedOrganizationIds: [],
  allowedCompanyIds: [],
  allowedOrganizationUnitIds: [],
};

const buildTenant = (
  overrides: Partial<TenantContext> = {},
): TenantContext => ({
  ...baseTenant,
  ...overrides,
});

describe('AccReportsService – multi-tenant filtering', () => {
  const originalQueue = (queueModule as any).accReportsQueue;

  afterEach(() => {
    (queueModule as any).accReportsQueue = originalQueue;
    jest.clearAllMocks();
  });

  it('enqueues trial balance with tenant scoped payload', async () => {
    const queueMock = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getJob: jest.fn(),
    };
    (queueModule as any).accReportsQueue = queueMock;

    const prisma = {
      cashTransaction: { groupBy: jest.fn() },
      trialBalanceCache: { create: jest.fn() },
    };

    const service = new AccReportsService(prisma as any);
    const tenant = buildTenant({ organizationId: 7, companyId: 55 });

    const jobId = await service.enqueueTrialBalance(tenant, {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      cache: true,
    });

    expect(queueMock.add).toHaveBeenCalledWith('trial-balance', {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      cache: true,
      organizationId: 7,
      companyId: 55,
    });
    expect(jobId).toBe('job-123');
  });

  it('filters cash transactions by organization/company when processing a job', async () => {
    const prisma = {
      cashTransaction: {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ type: 'INCOME', _sum: { amount: 150 } }]),
      },
      trialBalanceCache: { create: jest.fn().mockResolvedValue(undefined) },
    };

    const service = new AccReportsService(prisma as any);

    const job = {
      id: 'job-456',
      data: {
        startDate: '2024-02-01',
        endDate: '2024-02-29',
        cache: true,
        organizationId: 11,
        companyId: 3,
      },
    } as any;

    await (service as any).processJob(job);

    expect(prisma.cashTransaction.groupBy).toHaveBeenCalledWith({
      by: ['type'],
      where: {
        createdAt: {
          gte: new Date('2024-02-01'),
          lte: new Date('2024-02-29'),
        },
        organizationId: 11,
        cashRegister: { store: { companyId: 3 } },
      },
      _sum: { amount: true },
    });
    expect(prisma.trialBalanceCache.create).toHaveBeenCalledWith({
      data: {
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-29'),
        data: [{ type: 'INCOME', _sum: { amount: 150 } }],
      },
    });
  });

  it('throws when requesting a job from a different organization', async () => {
    const queueMock = {
      add: jest.fn(),
      getJob: jest.fn().mockResolvedValue({
        id: 'job-999',
        data: { organizationId: 22, companyId: null },
        getState: jest.fn().mockResolvedValue('completed'),
        progress: 0,
        returnvalue: [],
      }),
    };
    (queueModule as any).accReportsQueue = queueMock;

    const prisma = {
      cashTransaction: { groupBy: jest.fn() },
      trialBalanceCache: { create: jest.fn() },
    };

    const service = new AccReportsService(prisma as any);

    await expect(
      service.getJob(buildTenant({ organizationId: 1 }), 'job-999'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns job status when tenant matches', async () => {
    const jobMock = {
      id: 'job-111',
      data: { organizationId: 5, companyId: 8 },
      getState: jest.fn().mockResolvedValue('completed'),
      progress: 100,
      returnvalue: [{ type: 'INCOME', amount: 123 }],
    };
    const queueMock = {
      add: jest.fn(),
      getJob: jest.fn().mockResolvedValue(jobMock),
    };
    (queueModule as any).accReportsQueue = queueMock;

    const prisma = {
      cashTransaction: { groupBy: jest.fn() },
      trialBalanceCache: { create: jest.fn() },
    };

    const service = new AccReportsService(prisma as any);

    const result = await service.getJob(
      buildTenant({ organizationId: 5, companyId: 8 }),
      'job-111',
    );

    expect(result).toEqual({
      id: 'job-111',
      state: 'completed',
      progress: 100,
      result: [{ type: 'INCOME', amount: 123 }],
    });
    expect(jobMock.getState).toHaveBeenCalledTimes(1);
  });
});
