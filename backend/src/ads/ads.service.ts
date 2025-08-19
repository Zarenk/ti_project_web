import { ForbiddenException, Injectable } from '@nestjs/common';
import { AdsRole } from './roles.enum';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PublishCampaignDto } from './dto/publish-campaign.dto';
import { CreateCreativeDto } from './dto/create-creative.dto';
import { UpdateCreativeDto } from './dto/update-creative.dto';
import { ReviewCreativeDto } from './dto/review-creative.dto';
import { Logger } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import {
  ADS_GENERATE_QUEUE,
  ADS_PUBLISH_QUEUE,
  generateQueue,
  publishQueue,
  generateDlqQueue,
  publishDlqQueue,
} from './ads.queue';
import { redisConfig, redisEnabled } from '../config/redis.config';

export interface PromptRun {
  idempotencyKey: string;
}

export interface AdsJobData {
  promptRun: PromptRun;
  requestId: string;
  creativeId: string;
}

interface AdsUser {
  id: number;
  role: AdsRole;
  organizationId?: number;
}

export class QuotaExceededError extends Error {}

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);
  private generateWorker: Worker<AdsJobData> | null = null;
  private publishWorker: Worker<AdsJobData> | null = null;

  constructor() {
    if (redisEnabled) {
      this.createWorkers();
    } else {
      this.logger.warn('Redis disabled, ads workers will not start');
    }
  }

  private createWorkers() {
    const generateWorker = new Worker<AdsJobData>(
      ADS_GENERATE_QUEUE,
      async (job) => this.processGenerate(job),
      {
        connection: redisConfig,
        concurrency: 5,
        limiter: { max: 10, duration: 1000 },
      },
    );
    this.generateWorker = generateWorker;

    generateWorker.on('failed', async (job, err) => {
      if (!job) return;
      if (generateDlqQueue) {
        await generateDlqQueue.add('failed', job.data, { jobId: job.id });
      }
      if (this.generateWorker) {
        await this.handleFailure(this.generateWorker, err);
      }
    });

    const publishWorker = new Worker<AdsJobData>(
      ADS_PUBLISH_QUEUE,
      async (job) => this.processPublish(job),
      {
        connection: redisConfig,
        concurrency: 2,
        limiter: { max: 5, duration: 1000 },
      },
    );
    this.publishWorker = publishWorker;

    publishWorker.on('failed', async (job, err) => {
      if (!job) return;
      if (publishDlqQueue) {
        await publishDlqQueue.add('failed', job.data, { jobId: job.id });
      }
      if (this.publishWorker) {
        await this.handleFailure(this.publishWorker, err);
      }
    });
  }

  private async handleFailure(worker: Worker<AdsJobData>, err: unknown) {
    if (err instanceof QuotaExceededError) {
      this.logger.warn('Quota exceeded, pausing worker');
      await worker.pause(true);
      setTimeout(async () => {
        try {
          await worker.resume();
        } catch (e) {
          this.logger.error(e);
        }
      }, 60_000);
    }
  }

  private async processGenerate(job: Job<AdsJobData>) {
    this.logger.log('processing generate', {
      requestId: job.data.requestId,
      jobId: job.id,
      creativeId: job.data.creativeId,
    });
    // TODO: implement generation logic
  }

  private async processPublish(job: Job<AdsJobData>) {
    this.logger.log('processing publish', {
      requestId: job.data.requestId,
      jobId: job.id,
      creativeId: job.data.creativeId,
    });
    // TODO: implement publish logic
  }

  async enqueueGenerate(data: AdsJobData) {

    if (!generateQueue) {
      this.logger.warn('Redis disabled, generate job not enqueued');
      return;
    }

    await generateQueue.add('generate', data, {
      jobId: data.promptRun.idempotencyKey,
    });
  }

  async enqueuePublish(data: AdsJobData) {

    if (!publishQueue) {
      this.logger.warn('Redis disabled, publish job not enqueued');
      return;
    }

    await publishQueue.add('publish', data, {
      jobId: data.promptRun.idempotencyKey,
    });
  }

  async requeueDlq(queue: 'generate' | 'publish') {
    const dlq = queue === 'generate' ? generateDlqQueue : publishDlqQueue;
    const main = queue === 'generate' ? generateQueue : publishQueue;
    if (!dlq || !main) {
      this.logger.warn('Redis disabled, cannot requeue DLQ');
      return 0;
    }
    const jobs = await dlq.getJobs(['waiting', 'delayed', 'failed']);
    for (const job of jobs) {
      await main.add(job.name, job.data, { jobId: job.id });
      await job.remove();
    }
    return jobs.length;
  }

  private ensureAccess(user: AdsUser, roles: AdsRole[], organizationId?: number) {
    if (roles.length && !roles.includes(user.role)) {
      throw new ForbiddenException('Forbidden role');
    }
    if (organizationId && user.organizationId !== organizationId) {
      throw new ForbiddenException('Forbidden organization');
    }
  }

  createCampaign(user: AdsUser, dto: CreateCampaignDto) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    return { ...dto, id: Date.now() };
  }

  updateCampaign(id: number, user: AdsUser, dto: UpdateCampaignDto) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    return { id, ...dto };
  }

  publishCampaign(id: number, user: AdsUser, dto: PublishCampaignDto) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    return { id, published: dto.publish };
  }

  createCreative(user: AdsUser, dto: CreateCreativeDto) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    return { ...dto, id: Date.now() };
  }

  updateCreative(id: number, user: AdsUser, dto: UpdateCreativeDto) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    return { id, ...dto };
  }

  reviewCreative(id: number, user: AdsUser, dto: ReviewCreativeDto) {
    this.ensureAccess(user, [AdsRole.REVIEWER], dto.organizationId);
    return { id, approved: dto.approved, notes: dto.notes };
  }
}