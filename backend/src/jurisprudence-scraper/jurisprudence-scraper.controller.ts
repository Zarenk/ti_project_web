import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { JurisprudenceScraperService } from './jurisprudence-scraper.service';
import { JurisprudenceTextExtractorService } from '../jurisprudence-documents/jurisprudence-text-extractor.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { TenantRequiredGuard } from '../common/guards/tenant-required.guard';
import { Roles } from '../users/roles.decorator';
import { ModulePermission } from '../common/decorators/module-permission.decorator';
import { UserRole } from '@prisma/client';
import { TriggerScrapingDto } from './dto/trigger-scraping.dto';
import { PrismaService } from '../prisma/prisma.service';
import { COURT_SECTIONS } from './court-sections.config';

@Controller('jurisprudence-scraper')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@ModulePermission('legal')
export class JurisprudenceScraperController {
  constructor(
    private readonly scraperService: JurisprudenceScraperService,
    private readonly textExtractor: JurisprudenceTextExtractorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /jurisprudence-scraper/trigger
   * Start a scraping job for a court
   */
  @Post('trigger')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async triggerScraping(@Body() dto: TriggerScrapingDto, @Req() req: any) {
    const { organizationId, companyId } = req.tenantContext;
    const userId = req.user?.userId;

    const job = await this.scraperService.triggerScraping(
      organizationId,
      companyId,
      dto.court,
      dto.startYear,
      dto.endYear,
      dto.scrapeType,
      userId,
    );

    // Start processing in background (don't await — return immediately)
    this.scraperService.processScrapeJob(job.id).catch((err) => {
      // Errors are already handled inside processScrapeJob
      console.error(`Background scrape job ${job.id} error:`, err.message);
    });

    return {
      success: true,
      jobId: job.id,
      status: job.status,
      court: job.court,
      message: 'Scraping job triggered successfully. Processing in background.',
    };
  }

  /**
   * GET /jurisprudence-scraper/jobs
   * List scraping jobs for the organization
   */
  @Get('jobs')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async listJobs(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const { organizationId, companyId } = req.tenantContext;
    const pageNum = page || 1;
    const limitNum = limit || 20;
    const skip = (pageNum - 1) * limitNum;

    const where = { organizationId, companyId };

    const [jobs, total] = await Promise.all([
      this.prisma.jurisprudenceScrapeJob.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, username: true },
          },
        },
      }),
      this.prisma.jurisprudenceScrapeJob.count({ where }),
    ]);

    return {
      success: true,
      jobs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * GET /jurisprudence-scraper/jobs/:id
   * Get details of a specific scraping job
   */
  @Get('jobs/:id')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async getJob(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const { organizationId } = req.tenantContext;

    const job = await this.prisma.jurisprudenceScrapeJob.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: {
          select: { id: true, username: true },
        },
      },
    });

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    return { success: true, job };
  }

  /**
   * POST /jurisprudence-scraper/process-pending
   * Process all pending documents (extract text + generate embeddings)
   */
  @Post('process-pending')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async processPending(@Req() req: any) {
    const { organizationId, companyId } = req.tenantContext;

    const processed = await this.textExtractor.processAllPending(
      organizationId,
      companyId,
    );

    return {
      success: true,
      processed,
      message: `${processed} documents processed`,
    };
  }

  /**
   * GET /jurisprudence-scraper/courts
   * List available courts that can be scraped
   */
  @Get('courts')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async listCourts() {
    const courts = Object.keys(COURT_SECTIONS).map((court) => ({
      name: court,
      sections: COURT_SECTIONS[court].map((s) => ({
        name: s.name,
        category: s.category,
        area: s.area,
      })),
    }));

    return { success: true, courts };
  }
}
