import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { AccountingService, AccountNode } from './accounting.service';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { AccountingSummaryService } from './services/accounting-summary.service';
import { PleExportService } from './services/ple-export.service';
import { Response } from 'express';
import { format } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('accounting')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly summaryService: AccountingSummaryService,
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
    @Body() body: { code: string; name: string; parentId?: number | null },
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<AccountNode> {
    return this.accountingService.createAccount(body, tenant);
  }

  @Put('accounts/:id')
  updateAccount(
    @Param('id') id: string,
    @Body() body: { code: string; name: string; parentId?: number | null },
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

  @Get('export/ple')
  async exportPle(
    @Query('period') period: string,
    @Query('format') exportFormat: '5.1' | '6.1',
    @CurrentTenant() tenant: TenantContext | null,
    @Res() res: Response,
  ) {
    if (!period || !exportFormat) {
      throw new BadRequestException('Period and format are required');
    }

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
    const [year, month] = period.split('-');
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
