import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { DebitNotePostedDto } from './dto/debit-note-posted.dto';

@Controller('accounting/hooks/debit-note-posted')
export class DebitNotePostedController {
  @Post()
  @HttpCode(202)
  handle(@Body() data: DebitNotePostedDto) {
    return { status: 'accepted' };
  }
}