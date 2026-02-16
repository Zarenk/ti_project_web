import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { AccountingService, AccountNode } from './accounting.service';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { AccountingSummaryService } from './services/accounting-summary.service';
import { PleExportService } from './services/ple-export.service';
import { AccountingAnalyticsService } from './services/accounting-analytics.service';
import { JournalEntryService, CreateJournalEntryDto, UpdateJournalEntryDto, JournalEntryFilters } from './services/journal-entry.service';
import { AccountMappingService } from './services/account-mapping.service';
import { Response } from 'express';
import { format } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('accounting')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly summaryService: AccountingSummaryService,
    private readonly analyticsService: AccountingAnalyticsService,
    private readonly journalEntryService: JournalEntryService,
    private readonly accountMappingService: AccountMappingService,
    private readonly pleService: PleExportService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('accounts')
  getAccounts(
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<AccountNode[]> {
    return this.accountingService.getAccounts(tenant);
  }

  @Post('accounts')
  createAccount(
    @Body()
    body: {
      code: string;
      name: string;
      accountType: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
      parentId?: number | null;
    },
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<AccountNode> {
    return this.accountingService.createAccount(body, tenant);
  }

  @Put('accounts/:id')
  updateAccount(
    @Param('id') id: string,
    @Body()
    body: {
      code: string;
      name: string;
      accountType?: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';
      parentId?: number | null;
    },
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<AccountNode> {
    return this.accountingService.updateAccount(Number(id), body, tenant);
  }

  @Get('reports/ledger')
  getLedger(
    @Query('accountCode') accountCode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('size') size = '20',
    @CurrentTenant() tenant: TenantContext | null = null,
  ) {
    return this.accountingService.getLedger(
      {
        accountCode,
        from,
        to,
        page: Number(page),
        size: Number(size),
      },
      tenant,
    );
  }

  @Get('reports/trial-balance')
  getTrialBalance(
    @Query('period') period: string,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.accountingService.getTrialBalance(period, tenant);
  }

  @Get('summary')
  async getSummary(@CurrentTenant() tenant: TenantContext | null) {
    return this.summaryService.calculateSummary(tenant);
  }

  @Get('analytics/cash-flow')
  async getCashFlow(@CurrentTenant() tenant: TenantContext | null) {
    return this.analyticsService.getCashFlow(tenant);
  }

  @Get('analytics/health-score')
  async getHealthScore(@CurrentTenant() tenant: TenantContext | null) {
    return this.analyticsService.getHealthScore(tenant);
  }

  // ==================== JOURNAL ENTRIES ====================

  @Post('journal-entries')
  async createJournalEntry(
    @Body() dto: CreateJournalEntryDto,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.journalEntryService.create(dto, tenant);
  }

  @Get('journal-entries')
  async getJournalEntries(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sources') sources?: string,
    @Query('statuses') statuses?: string,
    @Query('accountIds') accountIds?: string,
    @Query('balanced') balanced?: string,
    @Query('page') page = '1',
    @Query('size') size = '20',
    @CurrentTenant() tenant: TenantContext | null = null,
  ) {
    const filters: JournalEntryFilters = {};

    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);
    if (sources) filters.sources = sources.split(',');
    if (statuses) filters.statuses = statuses.split(',') as any;
    if (accountIds) filters.accountIds = accountIds.split(',').map(Number);
    if (balanced !== undefined) filters.balanced = balanced === 'true';

    return this.journalEntryService.findAll(filters, tenant, Number(page), Number(size));
  }

  @Get('journal-entries/:id')
  async getJournalEntry(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.journalEntryService.findOne(Number(id), tenant);
  }

  @Put('journal-entries/:id')
  async updateJournalEntry(
    @Param('id') id: string,
    @Body() dto: UpdateJournalEntryDto,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.journalEntryService.update(Number(id), dto, tenant);
  }

  @Post('journal-entries/:id/post')
  async postJournalEntry(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.journalEntryService.post(Number(id), tenant);
  }

  @Post('journal-entries/:id/void')
  async voidJournalEntry(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.journalEntryService.void(Number(id), tenant);
  }

  @Delete('journal-entries/:id')
  async deleteJournalEntry(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    await this.journalEntryService.delete(Number(id), tenant);
    return { success: true };
  }

  // ==================== ACCOUNT MAPPING ====================

  @Get('accounts/by-code/:code')
  async getAccountByCode(
    @Param('code') code: string,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.accountMappingService.getAccountByCode(code, tenant);
  }

  @Get('accounts/common')
  async getCommonAccounts(@CurrentTenant() tenant: TenantContext | null) {
    return this.accountMappingService.getCommonAccounts(tenant);
  }

  // ==================== PLE EXPORT ====================

  @Get('export/ple')
  async exportPle(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') exportFormat: '5.1' | '6.1',
    @CurrentTenant() tenant: TenantContext | null,
    @Res() res: Response,
  ) {
    if (!from || !to || !exportFormat) {
      throw new BadRequestException('from, to, and format are required');
    }

    const period = { from: new Date(from), to: new Date(to) };
    let content: string;

    if (exportFormat === '5.1') {
      content = await this.pleService.exportLibroDiario(period, tenant);
    } else if (exportFormat === '6.1') {
      content = await this.pleService.exportLibroMayor(period, tenant);
    } else {
      throw new BadRequestException('Invalid format. Use 5.1 or 6.1');
    }

    // Generar nombre de archivo según estándar SUNAT
    const company = await this.prisma.company.findFirst({
      where: { id: tenant?.companyId ?? undefined },
      select: { sunatRuc: true },
    });
    const ruc = company?.sunatRuc || '00000000000';
    const fromDate = new Date(from);
    const year = format(fromDate, 'yyyy');
    const month = format(fromDate, 'MM');
    const day = format(new Date(), 'dd');
    const formatCode = exportFormat.replace('.', '');
    const indicator = '00';
    const estado = '1';

    const filename = `LE${ruc}${year}${month}${day}${formatCode}${indicator}${estado}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }
}
