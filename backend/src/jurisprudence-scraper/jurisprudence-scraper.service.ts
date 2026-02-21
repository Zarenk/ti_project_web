import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { JurisprudenceJobStatus, JurisprudenceScrapeType, JurisprudenceProcessingStatus } from '@prisma/client';
import { scrapeQueue } from '../jurisprudence/jurisprudence.queue';

@Injectable()
export class JurisprudenceScraperService {
  private readonly logger = new Logger(JurisprudenceScraperService.name);
  private readonly STORAGE_PATH = process.env.JURISPRUDENCE_STORAGE_PATH || './uploads/jurisprudence';
  private readonly RATE_LIMIT_MS = parseInt(process.env.JURISPRUDENCE_SCRAPING_DELAY || '2000', 10);
  private readonly USER_AGENT = 'JurisprudenceBot/1.0 (+mailto:legal@ecoterra.pe)';
  private readonly MAX_RETRIES = 3;

  constructor(private prisma: PrismaService) {
    this.ensureStorageDirectory();
  }

  private async ensureStorageDirectory() {
    try {
      await fs.mkdir(this.STORAGE_PATH, { recursive: true });
      this.logger.log(`Storage directory ensured: ${this.STORAGE_PATH}`);
    } catch (error) {
      this.logger.error(`Failed to create storage directory: ${(error as Error).message}`);
    }
  }

  /**
   * Trigger a scraping job
   */
  async triggerScraping(
    organizationId: number,
    companyId: number,
    court: string,
    startYear?: number,
    endYear?: number,
    scrapeType: JurisprudenceScrapeType = JurisprudenceScrapeType.MANUAL,
    createdById?: number,
  ) {
    this.logger.log(`Triggering scraping job for org ${organizationId}, court: ${court}`);

    // Check if scraping is enabled for this organization
    const config = await this.prisma.jurisprudenceConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.scrapingEnabled) {
      throw new Error('Scraping is not enabled for this organization');
    }

    // Check court is in enabled list
    const courtsEnabled = config.courtsEnabled as string[];
    if (!courtsEnabled.includes(court)) {
      throw new Error(`Court "${court}" is not enabled for scraping`);
    }

    // Create scrape job
    const job = await this.prisma.jurisprudenceScrapeJob.create({
      data: {
        organizationId,
        companyId,
        court,
        startYear,
        endYear,
        scrapeType,
        status: JurisprudenceJobStatus.PENDING,
        createdById,
      },
    });

    // Enqueue job if Redis is available
    if (scrapeQueue) {
      await scrapeQueue.add('scrape-court', {
        jobId: job.id,
        organizationId,
        companyId,
        court,
        startYear,
        endYear,
      });
      this.logger.log(`Scraping job ${job.id} enqueued`);
    } else {
      this.logger.warn(`Redis not available - job ${job.id} created but not enqueued`);
    }

    return job;
  }

  /**
   * Process a scraping job (called by worker)
   */
  async processScrapeJob(jobId: number) {
    this.logger.log(`Processing scrape job ${jobId}`);

    const job = await this.prisma.jurisprudenceScrapeJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Scrape job ${jobId} not found`);
    }

    try {
      await this.prisma.jurisprudenceScrapeJob.update({
        where: { id: jobId },
        data: {
          status: JurisprudenceJobStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      // TODO: Implement actual scraping logic based on court
      // For now, this is a placeholder that demonstrates the pattern

      const documents = await this.scrapeCourt(
        job.organizationId,
        job.companyId,
        job.court,
        job.startYear ?? undefined,
        job.endYear ?? undefined,
      );

      await this.prisma.jurisprudenceScrapeJob.update({
        where: { id: jobId },
        data: {
          status: JurisprudenceJobStatus.COMPLETED,
          completedAt: new Date(),
          documentsFound: documents.length,
          documentsDownloaded: documents.filter((d) => d.downloaded).length,
          documentsFailed: documents.filter((d) => d.failed).length,
        },
      });

      this.logger.log(`Scrape job ${jobId} completed: ${documents.length} documents processed`);
    } catch (error) {
      this.logger.error(`Scrape job ${jobId} failed: ${(error as Error).message}`);

      await this.prisma.jurisprudenceScrapeJob.update({
        where: { id: jobId },
        data: {
          status: JurisprudenceJobStatus.FAILED,
          completedAt: new Date(),
          errorLog: (error as Error).message,
        },
      });

      throw error;
    }
  }

  /**
   * Scrape documents from a specific court
   */
  private async scrapeCourt(
    organizationId: number,
    companyId: number,
    court: string,
    startYear?: number,
    endYear?: number,
  ): Promise<Array<{ downloaded: boolean; failed: boolean }>> {
    // TODO: Implement court-specific scraping logic
    // This would vary by court (Corte Suprema, Corte Superior, etc.)
    // For now, return empty array as placeholder

    this.logger.warn(`Court-specific scraping not yet implemented for: ${court}`);
    return [];
  }

  /**
   * Download a PDF from a URL
   */
  async downloadPdf(sourceUrl: string, organizationId: number): Promise<{ filePath: string; fileHash: string; fileSize: number }> {
    this.logger.log(`Downloading PDF from: ${sourceUrl}`);

    try {
      // Rate limiting
      await this.sleep(this.RATE_LIMIT_MS);

      // Download with proper headers
      const response = await axios.get(sourceUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': this.USER_AGENT,
        },
        timeout: 60000, // 60 seconds
      });

      // Check for CAPTCHA in response
      if (this.detectCaptcha(response.data)) {
        throw new Error('CAPTCHA detected - manual intervention required');
      }

      // Verify it's a PDF
      if (!response.headers['content-type']?.includes('pdf')) {
        this.logger.warn(`URL did not return a PDF: ${response.headers['content-type']}`);
      }

      const buffer = Buffer.from(response.data);
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const fileName = `jurisprudence-${organizationId}-${Date.now()}-${fileHash.substring(0, 8)}.pdf`;
      const filePath = path.join(this.STORAGE_PATH, fileName);

      await fs.writeFile(filePath, buffer);

      this.logger.log(`PDF downloaded successfully: ${filePath}`);

      return {
        filePath,
        fileHash,
        fileSize: buffer.length,
      };
    } catch (error) {
      this.logger.error(`Failed to download PDF from ${sourceUrl}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Detect if response contains CAPTCHA
   */
  private detectCaptcha(content: ArrayBuffer | string): boolean {
    const text = typeof content === 'string' ? content : Buffer.from(content).toString('utf-8');

    // Common CAPTCHA patterns
    const captchaPatterns = [
      /recaptcha/i,
      /hCaptcha/i,
      /captcha/i,
      /verify you are human/i,
      /verifica que eres humano/i,
    ];

    return captchaPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Check robots.txt compliance
   */
  async checkRobotsTxt(baseUrl: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).href;
      const response = await axios.get(robotsUrl, {
        headers: { 'User-Agent': this.USER_AGENT },
        timeout: 5000,
      });

      const robotsTxt = response.data;

      // Simple check - a proper implementation would parse User-agent sections
      if (robotsTxt.includes('Disallow: /')) {
        this.logger.warn(`robots.txt may disallow scraping: ${baseUrl}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Could not fetch robots.txt from ${baseUrl}: ${(error as Error).message}`);
      return true; // Assume allowed if robots.txt not found
    }
  }

  /**
   * Create a JurisprudenceDocument record
   */
  async createDocument(data: {
    organizationId: number;
    companyId: number;
    title: string;
    court: string;
    chamber?: string;
    expediente: string;
    year: number;
    publishDate: Date;
    sourceUrl: string;
    pdfPath: string;
    fileHash: string;
    fileName: string;
    fileSize: number;
    uploadedById?: number;
  }) {
    // Check for duplicate (idempotency)
    const existing = await this.prisma.jurisprudenceDocument.findUnique({
      where: {
        organizationId_sourceUrl_fileHash: {
          organizationId: data.organizationId,
          sourceUrl: data.sourceUrl,
          fileHash: data.fileHash,
        },
      },
    });

    if (existing) {
      if (existing.processingStatus === JurisprudenceProcessingStatus.COMPLETED) {
        this.logger.log(`Document already exists and is completed: ${existing.id}`);
        return existing;
      }

      // Update retry count if it failed before
      if (existing.processingStatus === JurisprudenceProcessingStatus.FAILED) {
        this.logger.log(`Document exists but failed - updating retry: ${existing.id}`);
        return this.prisma.jurisprudenceDocument.update({
          where: { id: existing.id },
          data: {
            retryCount: { increment: 1 },
            lastAttemptAt: new Date(),
            processingStatus: JurisprudenceProcessingStatus.PENDING,
          },
        });
      }

      return existing;
    }

    // Create new document
    return this.prisma.jurisprudenceDocument.create({
      data: {
        ...data,
        processingStatus: JurisprudenceProcessingStatus.PENDING,
      },
    });
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
