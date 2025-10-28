import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { accReportsQueue, ACC_REPORTS_QUEUE } from './acc-reports.queue';
import { redisConfig, redisEnabled } from '../config/redis.config';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

type TrialBalanceJobRequest = {
  startDate: string;
  endDate: string;
  cache?: boolean;
};

type TrialBalanceJob = TrialBalanceJobRequest & {
  organizationId?: number;
  companyId?: number;
};

@Injectable()
export class AccReportsService {
  private readonly logger = new Logger(AccReportsService.name);
  private worker: Worker<TrialBalanceJob> | null = null;

  constructor(private readonly prisma: PrismaService) {
    if (redisEnabled) {
      this.createWorker();
    } else {
      this.logger.warn('Redis disabled, acc-reports worker will not start');
    }
  }

  private createWorker() {
    const worker = new Worker<TrialBalanceJob>(
      ACC_REPORTS_QUEUE,
      async (job) => this.processJob(job),
      { connection: redisConfig },
    );
    this.worker = worker;

    worker.on('error', (err) => {
      this.logger.error(`Redis error on ${ACC_REPORTS_QUEUE}: ${err.message}`);
      void this.worker?.close();
      this.worker = null;
    });
  }

  private async processJob(job: Job<TrialBalanceJob>) {
    const { startDate, endDate, cache, organizationId, companyId } = job.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    logOrganizationContext({
      service: AccReportsService.name,
      operation: 'processTrialBalanceJob',
      organizationId: organizationId ?? null,
      companyId: companyId ?? null,
      metadata: { jobId: job.id },
    });

    const where: any = { createdAt: { gte: start, lte: end } };

    if (organizationId !== undefined) {
      where.organizationId = organizationId;
    }

    if (companyId !== undefined) {
      where.cashRegister = {
        ...(where.cashRegister ?? {}),
        store: { companyId },
      };
    }

    const grouped = await this.prisma.cashTransaction.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    });

    if (cache) {
      await this.prisma.trialBalanceCache.create({
        data: { startDate: start, endDate: end, data: grouped as any },
      });
    }

    return grouped;
  }

  async enqueueTrialBalance(
    tenant: TenantContext | null,
    data: TrialBalanceJobRequest,
  ) {
    if (!accReportsQueue) {
      this.logger.warn('Redis disabled, acc-reports job not enqueued');
      return null;
    }

    logOrganizationContext({
      service: AccReportsService.name,
      operation: 'enqueueTrialBalance',
      organizationId: tenant?.organizationId ?? null,
      companyId: tenant?.companyId ?? null,
      metadata: {
        cache: Boolean(data.cache),
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });

    const payload: TrialBalanceJob = {
      startDate: data.startDate,
      endDate: data.endDate,
    };

    if (data.cache !== undefined) {
      payload.cache = data.cache;
    }

    if (tenant?.organizationId !== null && tenant?.organizationId !== undefined) {
      payload.organizationId = tenant.organizationId;
    }

    if (tenant?.companyId !== null && tenant?.companyId !== undefined) {
      payload.companyId = tenant.companyId;
    }

    const job = await accReportsQueue.add('trial-balance', payload);
    return job.id;
  }

  async getJob(tenant: TenantContext | null, id: string) {
    if (!accReportsQueue) return null;
    const job = await (accReportsQueue as Queue<TrialBalanceJob>).getJob(id);
    if (!job) return null;
    const state = await job.getState();

    const jobOrgId =
      job.data.organizationId !== undefined
        ? job.data.organizationId
        : undefined;
    const jobCompanyId =
      job.data.companyId !== undefined ? job.data.companyId : undefined;

    if (
      tenant?.organizationId !== null &&
      tenant?.organizationId !== undefined &&
      jobOrgId !== tenant.organizationId
    ) {
      throw new ForbiddenException(
        `El reporte ${id} no pertenece a la organización seleccionada.`,
      );
    }

    if (
      tenant?.companyId !== null &&
      tenant?.companyId !== undefined &&
      jobCompanyId !== tenant.companyId
    ) {
      throw new ForbiddenException(
        `El reporte ${id} no pertenece a la compañía seleccionada.`,
      );
    }

    logOrganizationContext({
      service: AccReportsService.name,
      operation: 'getTrialBalanceJobStatus',
      organizationId: tenant?.organizationId ?? null,
      companyId: tenant?.companyId ?? null,
      metadata: { jobId: id, state },
    });

    return {
      id: job.id,
      state,
      progress: job.progress,
      result: job.returnvalue,
    };
  }
}
