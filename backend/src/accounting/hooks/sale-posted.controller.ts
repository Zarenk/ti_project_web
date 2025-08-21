import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SalePostedDto } from './dto/sale-posted.dto';

@Controller('accounting/hooks/sale-posted')
export class SalePostedController {
  @Post()
  @HttpCode(202)
  handle(@Body() data: SalePostedDto) {
    return { status: 'accepted' };
  }
}