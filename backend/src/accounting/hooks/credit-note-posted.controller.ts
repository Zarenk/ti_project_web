import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CreditNotePostedDto } from './dto/credit-note-posted.dto';

@Controller('accounting/hooks/credit-note-posted')
export class CreditNotePostedController {
  @Post()
  @HttpCode(202)
  handle(@Body() data: CreditNotePostedDto) {
    return { status: 'accepted' };
  }
}