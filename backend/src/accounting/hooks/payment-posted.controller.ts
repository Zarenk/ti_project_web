import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentPostedDto } from './dto/payment-posted.dto';

@Controller('accounting/hooks/payment-posted')
export class PaymentPostedController {
  @Post()
  @HttpCode(202)
  handle(@Body() data: PaymentPostedDto) {
    return { status: 'accepted' };
  }
}