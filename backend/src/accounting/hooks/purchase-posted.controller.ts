import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PurchasePostedDto } from './dto/purchase-posted.dto';

@Controller('accounting/hooks/purchase-posted')
export class PurchasePostedController {
  @Post()
  @HttpCode(202)
  handle(@Body() data: PurchasePostedDto) {
    return { status: 'accepted' };
  }
}