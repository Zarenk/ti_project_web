import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { InventoryAdjustedDto } from './dto/inventory-adjusted.dto';

@Controller('accounting/hooks/inventory-adjusted')
export class InventoryAdjustedController {
  @Post()
  @HttpCode(202)
  handle(@Body() data: InventoryAdjustedDto) {
    return { status: 'accepted' };
  }
}