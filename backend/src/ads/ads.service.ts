import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AdsRole } from './roles.enum';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PublishCampaignDto } from './dto/publish-campaign.dto';
import { CreateCreativeDto } from './dto/create-creative.dto';
import { UpdateCreativeDto } from './dto/update-creative.dto';
import { ReviewCreativeDto } from './dto/review-creative.dto';
import { Logger } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
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

  // In-memory storage for demo purposes only
  private campaigns: { id: number; name: string; status: string; organizationId: number }[] = [];
  private creatives: {
    id: number;
    name: string;
    image?: string;
    campaignId: number;
    organizationId: number;
  }[] = [];

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

    generateWorker.on('failed', (job, err) => {
      void (async () => {
        if (!job) return;
        if (generateDlqQueue) {
          await generateDlqQueue.add('failed', job.data, { jobId: job.id });
        }
        if (this.generateWorker) {
          await this.handleFailure(this.generateWorker, err);
        }
      })();
    });
    generateWorker.on('error', (err) => {
      this.logger.error(`Redis error on ${ADS_GENERATE_QUEUE}: ${err.message}`);
      void this.generateWorker?.close();
      this.generateWorker = null;
    });

    const publishWorker = new Worker<AdsJobData>(
      ADS_PUBLISH_QUEUE,
      (job) => this.processPublish(job),
      {
        connection: redisConfig,
        concurrency: 2,
        limiter: { max: 5, duration: 1000 },
      },
    );
    this.publishWorker = publishWorker;

    publishWorker.on('failed', (job, err) => {
      void (async () => {
        if (!job) return;
        if (publishDlqQueue) {
          await publishDlqQueue.add('failed', job.data, { jobId: job.id });
        }
        if (this.publishWorker) {
          await this.handleFailure(this.publishWorker, err);
        }
      })();
    });
    publishWorker.on('error', (err) => {
      this.logger.error(`Redis error on ${ADS_PUBLISH_QUEUE}: ${err.message}`);
      void this.publishWorker?.close();
      this.publishWorker = null;
    });
  }

  private async handleFailure(worker: Worker<AdsJobData>, err: unknown) {
    if (err instanceof QuotaExceededError) {
      this.logger.warn('Quota exceeded, pausing worker');
      await worker.pause(true);
      setTimeout(() => {
        try {
          worker.resume();
        } catch (e) {
          this.logger.error(e);
        }
      }, 60_000);
    }
  }

  private processGenerate(job: Job<AdsJobData>) {
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
    const jobs = await (dlq as Queue<AdsJobData>).getJobs([
      'waiting',
      'delayed',
      'failed',
    ]);
    for (const job of jobs) {
      await (main as Queue<AdsJobData>).add(job.name, job.data, {
        jobId: job.id,
      });
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

  listCampaigns(organizationId: number, page: number, pageSize: number) {
    const items = this.campaigns.filter((c) => c.organizationId === organizationId);
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total: items.length };
  }

  getCampaign(organizationId: number, id: number) {
    const campaign = this.campaigns.find(
      (c) => c.id === id && c.organizationId === organizationId,
    );
    if (!campaign) throw new NotFoundException('Campaign not found');
    const creatives = this.creatives.filter(
      (cr) => cr.campaignId === id && cr.organizationId === organizationId,
    );
    return { campaign, creatives };
  }

  getCreative(organizationId: number, id: number) {
    const creative = this.creatives.find(
      (cr) => cr.id === id && cr.organizationId === organizationId,
    );
    if (!creative) throw new NotFoundException('Creative not found');
    return creative;
  }

  createCampaign(user: AdsUser, dto: CreateCampaignDto & { organizationId: number }) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    const campaign = { ...dto, id: Date.now(), status: 'draft' };
    this.campaigns.push(campaign);
    return campaign;
  }

  updateCampaign(id: number, user: AdsUser, dto: UpdateCampaignDto & { organizationId: number }) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    const idx = this.campaigns.findIndex(
      (c) => c.id === id && c.organizationId === dto.organizationId,
    );
    if (idx === -1) throw new NotFoundException('Campaign not found');
    this.campaigns[idx] = { ...this.campaigns[idx], ...dto };
    return this.campaigns[idx];
  }

  publishCampaign(id: number, user: AdsUser, dto: PublishCampaignDto & { organizationId: number }) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    return { id, published: dto.publish };
  }

  createCreative(user: AdsUser, dto: CreateCreativeDto & { organizationId: number; campaignId: number }) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    const creative = { ...dto, id: Date.now(), name: dto.title || 'Untitled Creative' };
    this.creatives.push(creative);
    return creative;
  }

  updateCreative(id: number, user: AdsUser, dto: UpdateCreativeDto & { organizationId: number }) {
    this.ensureAccess(user, [AdsRole.ADMIN, AdsRole.MARKETING], dto.organizationId);
    const idx = this.creatives.findIndex(
      (cr) => cr.id === id && cr.organizationId === dto.organizationId,
    );
    if (idx === -1) throw new NotFoundException('Creative not found');
    this.creatives[idx] = { ...this.creatives[idx], ...dto };
    return this.creatives[idx];
  }

  reviewCreative(id: number, user: AdsUser, dto: ReviewCreativeDto & { organizationId: number }) {
    this.ensureAccess(user, [AdsRole.REVIEWER], dto.organizationId);
    return { id, approved: dto.approved, notes: dto.notes };
  }
}