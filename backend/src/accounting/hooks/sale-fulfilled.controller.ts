import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SaleFulfilledDto } from './dto/sale-fulfilled.dto';

@Controller('accounting/hooks/sale-fulfilled')
export class SaleFulfilledController {
  @Post()
  @HttpCode(202)
  handle(@Body() data: SaleFulfilledDto) {
    return { status: 'accepted' };
  }
}
