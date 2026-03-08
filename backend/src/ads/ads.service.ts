import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiAdapter } from './providers/gemini.adapter';
import { AdTone, AdStyle, ProductContext } from './providers/interfaces';
import { PublishService } from '../publish/publish.service';
import { PermanentError } from '../publish/error';
import { OAuthService } from './oauth/oauth.service';
import { SocialPlatform } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export interface PromptRun {
  idempotencyKey: string;
}

export interface AdsJobData {
  promptRun: PromptRun;
  requestId: string;
  creativeId: string;
}

export interface GenerateJobData extends AdsJobData {
  productId: number;
  organizationId: number;
  tone?: AdTone;
  style?: AdStyle;
}

export interface PublishJobData extends AdsJobData {
  adGenerationId: number;
  organizationId: number;
  networks: SocialPlatform[];
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
  private campaigns: {
    id: number;
    name: string;
    status: string;
    organizationId: number;
  }[] = [];
  private creatives: {
    id: number;
    name: string;
    image?: string;
    campaignId: number;
    organizationId: number;
  }[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiAdapter,
    private readonly publishService: PublishService,
    private readonly oauthService: OAuthService,
  ) {
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

  private async processGenerate(job: Job<AdsJobData>) {
    const data = job.data as GenerateJobData;
    this.logger.log('processing generate', {
      requestId: data.requestId,
      jobId: job.id,
      productId: data.productId,
    });

    try {
      await this.generateFromProduct(
        data.productId,
        data.organizationId,
        data.tone,
        data.style,
      );
    } catch (err) {
      if (err instanceof QuotaExceededError) throw err;
      this.logger.error(`Generate job failed: ${err}`);
      throw err;
    }
  }

  private async processPublish(job: Job<AdsJobData>) {
    const data = job.data as PublishJobData;
    this.logger.log('processing publish', {
      requestId: data.requestId,
      jobId: job.id,
      adGenerationId: data.adGenerationId,
      networks: data.networks,
    });

    try {
      await this.publishAd(
        data.adGenerationId,
        data.organizationId,
        data.networks,
      );
    } catch (err) {
      this.logger.error(`Publish job failed: ${err}`);
      throw err;
    }
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

  private ensureAccess(
    user: AdsUser,
    roles: AdsRole[],
    organizationId?: number,
  ) {
    if (roles.length && !roles.includes(user.role)) {
      throw new ForbiddenException('Forbidden role');
    }
    if (organizationId && user.organizationId !== organizationId) {
      throw new ForbiddenException('Forbidden organization');
    }
  }

  listCampaigns(organizationId: number, page: number, pageSize: number) {
    const items = this.campaigns.filter(
      (c) => c.organizationId === organizationId,
    );
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

  createCampaign(
    user: AdsUser,
    dto: CreateCampaignDto & { organizationId: number },
  ) {
    this.ensureAccess(
      user,
      [AdsRole.ADMIN, AdsRole.MARKETING],
      dto.organizationId,
    );
    const campaign = { ...dto, id: Date.now(), status: 'draft' };
    this.campaigns.push(campaign);
    return campaign;
  }

  updateCampaign(
    id: number,
    user: AdsUser,
    dto: UpdateCampaignDto & { organizationId: number },
  ) {
    this.ensureAccess(
      user,
      [AdsRole.ADMIN, AdsRole.MARKETING],
      dto.organizationId,
    );
    const idx = this.campaigns.findIndex(
      (c) => c.id === id && c.organizationId === dto.organizationId,
    );
    if (idx === -1) throw new NotFoundException('Campaign not found');
    this.campaigns[idx] = { ...this.campaigns[idx], ...dto };
    return this.campaigns[idx];
  }

  publishCampaign(
    id: number,
    user: AdsUser,
    dto: PublishCampaignDto & { organizationId: number },
  ) {
    this.ensureAccess(
      user,
      [AdsRole.ADMIN, AdsRole.MARKETING],
      dto.organizationId,
    );
    return { id, published: dto.publish };
  }

  createCreative(
    user: AdsUser,
    dto: CreateCreativeDto & { organizationId: number; campaignId: number },
  ) {
    this.ensureAccess(
      user,
      [AdsRole.ADMIN, AdsRole.MARKETING],
      dto.organizationId,
    );
    const creative = {
      ...dto,
      id: Date.now(),
      name: dto.title || 'Untitled Creative',
    };
    this.creatives.push(creative);
    return creative;
  }

  updateCreative(
    id: number,
    user: AdsUser,
    dto: UpdateCreativeDto & { organizationId: number },
  ) {
    this.ensureAccess(
      user,
      [AdsRole.ADMIN, AdsRole.MARKETING],
      dto.organizationId,
    );
    const idx = this.creatives.findIndex(
      (cr) => cr.id === id && cr.organizationId === dto.organizationId,
    );
    if (idx === -1) throw new NotFoundException('Creative not found');
    this.creatives[idx] = { ...this.creatives[idx], ...dto };
    return this.creatives[idx];
  }

  reviewCreative(
    id: number,
    user: AdsUser,
    dto: ReviewCreativeDto & { organizationId: number },
  ) {
    this.ensureAccess(user, [AdsRole.REVIEWER], dto.organizationId);
    return { id, approved: dto.approved, notes: dto.notes };
  }

  /**
   * Generate ad content from a product using Gemini AI.
   * Returns 3 variations of copy + images, saved as AdGeneration record.
   */
  async generateFromProduct(
    productId: number,
    organizationId: number,
    tone?: AdTone,
    style?: AdStyle,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
      include: {
        brand: true,
        category: true,
        features: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const imageUrl =
      product.images?.[0] || product.image || '';

    const productData: ProductContext = {
      name: product.name,
      description: product.description ?? undefined,
      price: product.price,
      priceSell: product.priceSell ?? undefined,
      brand: product.brand?.name ?? product.brandLabel ?? undefined,
      category: product.category?.name ?? undefined,
      features: product.features?.map((f) => ({
        title: f.title,
        description: f.description ?? undefined,
      })),
      images: product.images ?? [],
    };

    const result = await this.gemini.generateFromProduct(
      imageUrl,
      productData,
      tone || 'profesional',
      style || 'moderno',
    );

    // Save to database
    const adGeneration = await this.prisma.adGeneration.create({
      data: {
        organizationId,
        productId,
        analysis: result.analysis as any,
        variations: result.variations as any,
        imageUrls: result.imageUrls,
        tone: tone || 'profesional',
        style: style || 'moderno',
        costUsd: result.costUsd,
      },
    });

    return {
      id: adGeneration.id,
      ...result,
    };
  }

  /**
   * Get ad generations for a product.
   */
  async getAdGenerations(productId: number, organizationId: number) {
    return this.prisma.adGeneration.findMany({
      where: { productId, organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  /**
   * Save the user's selected variation index on an AdGeneration.
   */
  async selectAdVariation(
    id: number,
    organizationId: number,
    selectedIndex: number,
  ) {
    const adGen = await this.prisma.adGeneration.findFirst({
      where: { id, organizationId },
    });
    if (!adGen) {
      throw new NotFoundException(`AdGeneration ${id} not found`);
    }
    const variations = adGen.variations as any[];
    if (selectedIndex < 0 || selectedIndex >= variations.length) {
      throw new BadRequestException(
        `Invalid selectedIndex: ${selectedIndex}. Must be 0-${variations.length - 1}`,
      );
    }
    return this.prisma.adGeneration.update({
      where: { id },
      data: { selectedIndex },
    });
  }

  /**
   * Publish an ad generation to selected social networks.
   */
  async publishAd(
    adGenerationId: number,
    organizationId: number,
    networks: SocialPlatform[],
  ) {
    const adGen = await this.prisma.adGeneration.findFirst({
      where: { id: adGenerationId, organizationId },
    });

    if (!adGen) {
      throw new NotFoundException(`AdGeneration ${adGenerationId} not found`);
    }

    // Build caption from selected variation
    const variations = adGen.variations as any[];
    const selected = variations[adGen.selectedIndex ?? 0];
    const caption = selected
      ? `${selected.title}\n\n${selected.description}\n\n${(selected.hashtags || []).join(' ')}`
      : '';

    // Read the image (exported or original)
    const imagePath = adGen.exportedImage || adGen.imageUrls[adGen.selectedIndex ?? 0];
    let imageBuffer: Buffer;

    if (imagePath?.startsWith('data:')) {
      // Base64 data URL from canvas export
      const base64 = imagePath.split(',')[1];
      imageBuffer = Buffer.from(base64, 'base64');
    } else if (imagePath?.startsWith('http')) {
      const res = await fetch(imagePath);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } else if (imagePath) {
      const fullPath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
      imageBuffer = fs.readFileSync(fullPath);
    } else {
      throw new PermanentError('No image available for publishing');
    }

    // Publish to each selected network
    const results: Record<string, { status: string; externalId?: string; error?: string }> = {};

    for (const network of networks) {
      let account = await this.prisma.socialAccount.findFirst({
        where: { organizationId, platform: network, isActive: true },
      });

      if (!account) {
        results[network] = { status: 'error', error: 'No linked account' };
        continue;
      }

      // Auto-refresh expired tokens before publishing
      if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
        this.logger.log(`Token expired for ${network} account ${account.id}, attempting refresh`);
        try {
          const refreshed = await this.oauthService.refreshToken(account.id);
          if (refreshed) {
            account = await this.prisma.socialAccount.findUnique({
              where: { id: account.id },
            });
            if (!account) {
              results[network] = { status: 'error', error: 'Account not found after refresh' };
              continue;
            }
          } else {
            results[network] = {
              status: 'error',
              error: 'Token expirado. Reconecta tu cuenta desde "Conectar cuentas".',
            };
            continue;
          }
        } catch (err: any) {
          this.logger.error(`Token refresh failed for ${network}: ${err.message}`);
          results[network] = {
            status: 'error',
            error: 'Token expirado. Reconecta tu cuenta desde "Conectar cuentas".',
          };
          continue;
        }
      }

      try {
        const adapterName = network.toLowerCase();
        const externalId = await this.publishService.schedulePublish(
          imageBuffer,
          caption,
          adapterName,
          {
            accessToken: account.accessToken,
            accountId: account.accountId,
            metadata: account.metadata as Record<string, any> | undefined,
          },
        );
        results[network] = { status: 'success', externalId: externalId || undefined };
      } catch (err: any) {
        this.logger.error(`Publish to ${network} failed: ${err.message}`);
        results[network] = { status: 'error', error: err.message };
      }
    }

    // Update AdGeneration record
    const publishedTo = Object.entries(results)
      .filter(([, r]) => r.status === 'success')
      .map(([n]) => n);

    await this.prisma.adGeneration.update({
      where: { id: adGenerationId },
      data: {
        publishedTo,
        publishStatus: results,
        publishedAt: publishedTo.length > 0 ? new Date() : undefined,
      },
    });

    return results;
  }

  // ── Social Accounts CRUD ──────────────────────────────────────────

  async getSocialAccounts(organizationId: number) {
    return this.prisma.socialAccount.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        platform: true,
        accountName: true,
        accountId: true,
        tokenExpiresAt: true,
        metadata: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async createSocialAccount(
    organizationId: number,
    data: {
      platform: SocialPlatform;
      accountName: string;
      accountId: string;
      accessToken: string;
      refreshToken?: string;
    },
  ) {
    return this.prisma.socialAccount.upsert({
      where: {
        organizationId_platform_accountId: {
          organizationId,
          platform: data.platform,
          accountId: data.accountId,
        },
      },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accountName: data.accountName,
        isActive: true,
      },
      create: {
        organizationId,
        ...data,
      },
    });
  }

  async deleteSocialAccount(id: number, organizationId: number) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) {
      throw new NotFoundException(`SocialAccount ${id} not found`);
    }
    return this.prisma.socialAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
