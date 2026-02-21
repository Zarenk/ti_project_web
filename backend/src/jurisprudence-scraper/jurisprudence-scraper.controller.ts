import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JurisprudenceScraperService } from './jurisprudence-scraper.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { TenantRequiredGuard } from '../common/guards/tenant-required.guard';
import { Roles } from '../users/roles.decorator';
import { ModulePermission } from '../common/decorators/module-permission.decorator';
import { UserRole } from '@prisma/client';
import { TriggerScrapingDto } from './dto/trigger-scraping.dto';

@Controller('jurisprudence-scraper')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@ModulePermission('legal') // Jurisprudence is part of legal vertical
export class JurisprudenceScraperController {
  constructor(private readonly scraperService: JurisprudenceScraperService) {}

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

    return {
      success: true,
      jobId: job.id,
      status: job.status,
      court: job.court,
      message: 'Scraping job triggered successfully',
    };
  }
}
