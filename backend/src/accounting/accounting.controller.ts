import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AccountingService, AccountNode } from './accounting.service';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  getAccounts(): Promise<AccountNode[]> {
    return this.accountingService.getAccounts();
  }

  @Post('accounts')
  createAccount(
    @Body() body: { code: string; name: string; parentId?: number | null },
  ): Promise<AccountNode> {
    return this.accountingService.createAccount(body);
  }

  @Put('accounts/:id')
  updateAccount(
    @Param('id') id: string,
    @Body() body: { code: string; name: string; parentId?: number | null },
  ): Promise<AccountNode> {
    return this.accountingService.updateAccount(Number(id), body);
  }

  @Get('reports/ledger')
  getLedger(
    @Query('accountCode') accountCode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('size') size = '20',
  ) {
    return this.accountingService.getLedger({
      accountCode,
      from,
      to,
      page: Number(page),
      size: Number(size),
    });
  }

  @Get('reports/trial-balance')
  getTrialBalance(@Query('period') period: string) {
    return this.accountingService.getTrialBalance(period);
  }
}
