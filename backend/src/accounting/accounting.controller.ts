import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AccountingService, AccountNode } from './accounting.service';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('accounting')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

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
}
