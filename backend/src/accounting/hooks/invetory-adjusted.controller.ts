import { Body, Controller, HttpCode, Post, Logger, UseGuards } from '@nestjs/common';
import { format } from 'date-fns';
import { InventoryAdjustedDto } from './dto/inventory-adjusted.dto';
import { EntriesService } from '../entries.service';
import { InventoryAccountingService } from '../services/inventory-account.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('accounting/hooks/inventory-adjusted')
// TODO: Re-enable guards after adding auth headers to AccountingHookService
// @UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class InventoryAdjustedController {
  private readonly logger = new Logger(InventoryAdjustedController.name);

  constructor(
    private readonly entries: EntriesService,
    private readonly mapper: InventoryAccountingService,
  ) {}

  @Post()
  @HttpCode(202)
  async handle(@Body() data: InventoryAdjustedDto) {
    try {
      const lines = this.mapper.buildEntryFromAdjustment({
        account: data.counterAccount,
        description: data.description,
        amount: data.adjustment,
      });
      const entry = await this.entries.createDraft({
        period: format(new Date(data.timestamp), 'yyyy-MM'),
        date: new Date(data.timestamp),
        lines,
      });
      await this.entries.post(entry.id);
      this.logger.log(
        `Entry ${entry.id} created for product ${data.productId}`,
      );
      return { status: 'posted', entryId: entry.id };
    } catch (err) {
      this.logger.error(
        'Failed to process inventory-adjusted hook',
        err as any,
      );
      throw err;
    }
  }
}
