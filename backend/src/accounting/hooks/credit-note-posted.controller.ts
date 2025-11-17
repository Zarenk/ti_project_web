import {
  Body,
  Controller,
  HttpCode,
  Post,
  Logger,
  Inject,
} from '@nestjs/common';
import { format } from 'date-fns';
import { CreditNotePostedDto } from './dto/credit-note-posted.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntriesService, EntryLine } from '../entries.service';

@Controller('accounting/hooks/credit-note-posted')
export class CreditNotePostedController {
  private readonly logger = new Logger(CreditNotePostedController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entries: EntriesService,
    @Inject('CreditNoteAccountingService')
    private readonly mapper: {
      buildEntryFromCreditNote(note: any): EntryLine[];
    },
  ) {}

  @Post()
  @HttpCode(202)
  async handle(@Body() data: CreditNotePostedDto) {
    try {
      this.logger.log(
        `Received credit-note-posted event for credit note ${data.creditNoteId}`,
      );
      const creditNote = await (this.prisma as any).creditNote.findUnique({
        where: { id: data.creditNoteId },
      });
      if (!creditNote) {
        return { status: 'not_found' };
      }

      const lines = this.mapper.buildEntryFromCreditNote(creditNote);
      const entry = await this.entries.createDraft({
        period: format(new Date(data.timestamp), 'yyyy-MM'),
        date: new Date(data.timestamp),
        lines: lines.map(({ account, description, debit, credit }) => ({
          account,
          description,
          debit,
          credit,
        })),
      });
      await this.entries.post(entry.id);
      this.logger.log(
        `Entry ${entry.id} created for credit note ${data.creditNoteId}`,
      );
      return { status: 'posted', entryId: entry.id };
    } catch (err) {
      this.logger.error(
        'Failed to process credit-note-posted hook',
        err as any,
      );
      throw err;
    }
  }
}
