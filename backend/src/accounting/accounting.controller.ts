import { Controller, Get, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';

@Controller('accounting/reports')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('ledger')
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

  @Get('trial-balance')
  getTrialBalance(@Query('period') period: string) {
    return this.accountingService.getTrialBalance(period);
  }
}