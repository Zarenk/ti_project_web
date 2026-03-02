import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { JurisprudenceJobStatus, JurisprudenceScrapeType, JurisprudenceProcessingStatus } from '@prisma/client';
import { scrapeQueue } from '../jurisprudence/jurisprudence.queue';
import { COURT_SECTIONS, PJ_BASE_URL, MAX_PAGES_PER_SECTION, type CourtSection } from './court-sections.config';
import { JurisprudenceTextExtractorService } from '../jurisprudence-documents/jurisprudence-text-extractor.service';

interface PdfLinkInfo {
  url: string;
  title: string;
  expediente: string;
  year: number;
  area: string;
  chamber: string;
  category: string;
}

@Injectable()
export class JurisprudenceScraperService {
  private readonly logger = new Logger(JurisprudenceScraperService.name);
  private readonly STORAGE_PATH = process.env.JURISPRUDENCE_STORAGE_PATH || './uploads/jurisprudence';
  private readonly RATE_LIMIT_MS = parseInt(process.env.JURISPRUDENCE_SCRAPING_DELAY || '2000', 10);
  private readonly USER_AGENT = 'JurisprudenceBot/1.0 (+mailto:legal@ecoterra.pe)';
  private readonly MAX_RETRIES = 3;

  constructor(
    private prisma: PrismaService,
    private textExtractor: JurisprudenceTextExtractorService,
  ) {
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

    // Get or create config for this organization
    let config = await this.prisma.jurisprudenceConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      // Auto-create config with scraping enabled for the requested court
      config = await this.prisma.jurisprudenceConfig.create({
        data: {
          organizationId,
          companyId,
          ragEnabled: true,
          scrapingEnabled: true,
          courtsEnabled: [court],
        },
      });
      this.logger.log(`Auto-created JurisprudenceConfig for org ${organizationId}`);
    }

    if (!config.scrapingEnabled) {
      throw new Error('Scraping is not enabled for this organization');
    }

    // Check court is in enabled list — auto-add if not present
    const courtsEnabled = (config.courtsEnabled as string[]) || [];
    if (!courtsEnabled.includes(court)) {
      await this.prisma.jurisprudenceConfig.update({
        where: { organizationId },
        data: { courtsEnabled: [...courtsEnabled, court] },
      });
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
   * Scrape documents from a specific court by crawling its web sections.
   */
  private async scrapeCourt(
    organizationId: number,
    companyId: number,
    court: string,
    startYear?: number,
    endYear?: number,
  ): Promise<Array<{ downloaded: boolean; failed: boolean }>> {
    const sections = COURT_SECTIONS[court];
    if (!sections || sections.length === 0) {
      this.logger.warn(`No sections configured for court: ${court}`);
      return [];
    }

    this.logger.log(`Scraping ${sections.length} sections for court: ${court}`);
    const results: Array<{ downloaded: boolean; failed: boolean }> = [];

    for (const section of sections) {
      this.logger.log(`Scraping section: ${section.name}`);
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= MAX_PAGES_PER_SECTION) {
        try {
          const html = await this.fetchPage(section.url, page);
          const $ = cheerio.load(html);
          const pdfLinks = this.extractPdfLinks($, section);

          if (pdfLinks.length === 0) {
            this.logger.log(`No more PDFs found on page ${page} of section: ${section.name}`);
            hasMore = false;
            break;
          }

          this.logger.log(`Found ${pdfLinks.length} PDFs on page ${page} of section: ${section.name}`);

          for (const link of pdfLinks) {
            // Filter by year range if specified
            if (startYear && link.year < startYear) continue;
            if (endYear && link.year > endYear) continue;

            try {
              // Check if document already exists
              const existing = await this.prisma.jurisprudenceDocument.findFirst({
                where: {
                  organizationId,
                  sourceUrl: link.url,
                  deletedAt: null,
                },
              });

              if (existing) {
                this.logger.log(`Document already exists, skipping: ${link.title}`);
                results.push({ downloaded: false, failed: false });
                continue;
              }

              // Download PDF
              const { filePath, fileHash, fileSize } = await this.downloadPdf(link.url, organizationId);

              // Create document record
              const doc = await this.createDocument({
                organizationId,
                companyId,
                title: link.title,
                court,
                chamber: link.chamber,
                expediente: link.expediente,
                year: link.year,
                publishDate: new Date(link.year, 0, 1), // January 1st of the year
                sourceUrl: link.url,
                pdfPath: filePath,
                fileHash,
                fileName: path.basename(filePath),
                fileSize,
              });

              // Extract text and generate embeddings
              try {
                await this.textExtractor.extractAndProcess(doc.id);
              } catch (extractError) {
                this.logger.warn(
                  `Text extraction failed for ${doc.id}, document still saved: ${(extractError as Error).message}`,
                );
              }

              results.push({ downloaded: true, failed: false });
            } catch (error) {
              this.logger.error(`Failed to process PDF ${link.url}: ${(error as Error).message}`);
              results.push({ downloaded: false, failed: true });
            }
          }

          // Check if there's a next page
          hasMore = this.hasNextPage($, page);
          page++;
        } catch (error) {
          this.logger.error(
            `Failed to fetch page ${page} of section ${section.name}: ${(error as Error).message}`,
          );
          hasMore = false;
        }
      }
    }

    return results;
  }

  /**
   * Fetch an HTML page from the PJ website with rate limiting.
   */
  private async fetchPage(sectionUrl: string, page: number): Promise<string> {
    await this.sleep(this.RATE_LIMIT_MS);

    const url = page === 1 ? sectionUrl : `${sectionUrl}?WCM_PI=${page}`;

    this.logger.log(`Fetching page: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': this.USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
      },
      timeout: 30000,
    });

    if (this.detectCaptcha(response.data)) {
      throw new Error('CAPTCHA detected while fetching page');
    }

    return response.data;
  }

  /**
   * Extract PDF links from a parsed HTML page.
   * PJ.gob.pe PDFs follow pattern: /wps/wcm/connect/[HASH]/[FILENAME].pdf
   */
  private extractPdfLinks($: cheerio.CheerioAPI, section: CourtSection): PdfLinkInfo[] {
    const links: PdfLinkInfo[] = [];
    const seenUrls = new Set<string>();

    // Find all <a> tags linking to PDFs
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';

      // Match PDF links from PJ website
      if (!href.toLowerCase().includes('.pdf')) return;

      // Build absolute URL
      let absoluteUrl: string;
      if (href.startsWith('http')) {
        absoluteUrl = href;
      } else {
        absoluteUrl = `${PJ_BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
      }

      // Deduplicate
      const cleanUrl = absoluteUrl.split('?')[0]; // Remove query params for dedup
      if (seenUrls.has(cleanUrl)) return;
      seenUrls.add(cleanUrl);

      // Get link text for metadata
      const linkText = $(el).text().trim();
      const parentText = $(el).parent().text().trim();

      // Parse metadata from the link text and filename
      const metadata = this.parseDocumentMetadata(linkText, parentText, href, section);

      links.push({
        url: absoluteUrl,
        ...metadata,
      });
    });

    return links;
  }

  /**
   * Parse document metadata from link text and filename.
   * Extracts expediente number, year, and title from PJ document names.
   */
  private parseDocumentMetadata(
    linkText: string,
    parentText: string,
    href: string,
    section: CourtSection,
  ): Omit<PdfLinkInfo, 'url'> {
    // Try to extract expediente (case number) from text
    // Common patterns: "N°03-2012/CJ-116", "CAS Nº 0301-2011", "RN N° 0956-2011"
    const expedientePatterns = [
      /N[°º]\s*(\d{1,4}[-–]\d{4}(?:\/[A-Z]+-\d+)?)/i,
      /CAS\.?\s*(?:N[°º])?\s*(\d{1,4}[-–]\d{4})/i,
      /R\.?N\.?\s*(?:N[°º])?\s*(\d{1,4}[-–]\d{4})/i,
      /(?:Exp|Expediente)\.?\s*(?:N[°º])?\s*(\d{1,5}[-–]\d{4})/i,
    ];

    let expediente = 'SIN-EXPEDIENTE';
    const textToSearch = `${linkText} ${parentText}`;

    for (const pattern of expedientePatterns) {
      const match = textToSearch.match(pattern);
      if (match) {
        expediente = match[1].replace('–', '-');
        break;
      }
    }

    // Try to extract year from text or filename
    let year = new Date().getFullYear();
    const yearMatch = textToSearch.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    } else {
      // Try from filename
      const filenameYearMatch = href.match(/(\d{4})/);
      if (filenameYearMatch) {
        const parsedYear = parseInt(filenameYearMatch[1], 10);
        if (parsedYear >= 1990 && parsedYear <= new Date().getFullYear()) {
          year = parsedYear;
        }
      }
    }

    // Build title from link text or fallback to filename
    let title = linkText || parentText;
    if (!title || title.length < 5) {
      // Extract from filename
      const filename = decodeURIComponent(href.split('/').pop() || '')
        .replace(/\.pdf$/i, '')
        .replace(/\+/g, ' ')
        .replace(/%2B/g, ' ');
      title = filename;
    }

    // Clean up title
    title = title.substring(0, 500).trim();

    return {
      title,
      expediente,
      year,
      area: section.area,
      chamber: section.chamber,
      category: section.category,
    };
  }

  /**
   * Check if there's a next page in the WCM pagination.
   */
  private hasNextPage($: cheerio.CheerioAPI, currentPage: number): boolean {
    // WCM pagination typically shows "Página X de Y" text
    const paginationText = $('body').text();
    const pageMatch = paginationText.match(
      /[Pp](?:á|a)gina\s+(\d+)\s+de\s+(\d+)/,
    );

    if (pageMatch) {
      const current = parseInt(pageMatch[1], 10);
      const total = parseInt(pageMatch[2], 10);
      return current < total;
    }

    // Alternative: check for "next page" links
    const hasNextLink = $('a[title*="siguiente"], a[title*="Siguiente"], a.next, a[title*="next"]').length > 0;
    return hasNextLink;
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
