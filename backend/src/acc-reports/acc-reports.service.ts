import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { accReportsQueue, ACC_REPORTS_QUEUE } from './acc-reports.queue';
import { redisConfig, redisEnabled } from '../config/redis.config';
import { PrismaService } from '../prisma/prisma.service';

type TrialBalanceJob = {
  startDate: string;
  endDate: string;
  cache?: boolean;
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
    const { startDate, endDate, cache } = job.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const grouped = await this.prisma.cashTransaction.groupBy({
      by: ['type'],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    if (cache) {
      await this.prisma.trialBalanceCache.create({
        data: { startDate: start, endDate: end, data: grouped as any },
      });
    }

    return grouped;
  }

  async enqueueTrialBalance(data: TrialBalanceJob) {
    if (!accReportsQueue) {
      this.logger.warn('Redis disabled, acc-reports job not enqueued');
      return null;
    }
    const job = await accReportsQueue.add('trial-balance', data);
    return job.id;
  }

  async getJob(id: string) {
    if (!accReportsQueue) return null;
    const job = await (accReportsQueue as Queue<TrialBalanceJob>).getJob(id);
    if (!job) return null;
    const state = await job.getState();
    return {
      id: job.id,
      state,
      progress: job.progress,
      result: job.returnvalue,
    };
  }
}
