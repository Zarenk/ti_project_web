import { Body, Controller, HttpCode, Post, Logger } from '@nestjs/common';
import { DebitNotePostedDto } from './dto/debit-note-posted.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntriesService } from '../entries.service';
import { format } from 'date-fns';
import { DebitNoteAccountingService } from '../services/debit-note-accounting.service';

@Controller('accounting/hooks/debit-note-posted')
export class DebitNotePostedController {
  private readonly logger = new Logger(DebitNotePostedController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entries: EntriesService,
    private readonly mapper: DebitNoteAccountingService,
  ) {}

  @Post()
  @HttpCode(202)
  async handle(@Body() data: DebitNotePostedDto) {
    try {
      this.logger.log(
        `Received debit-note-posted event for debit note ${data.debitNoteId}`,
      );
      const debitNote = await (this.prisma as any).debitNote.findUnique({
        where: { id: data.debitNoteId },
        include: { provider: true },
      });
      if (!debitNote) {
        return { status: 'not_found' };
      }
      const total = debitNote.total ?? 0;
      const igv = debitNote.igv ?? +(total - total / 1.18).toFixed(2);
      const lines = this.mapper.buildEntryFromDebitNote({
        total,
        igv,
        provider: debitNote.provider,
      });
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
        `Entry ${entry.id} created for debit note ${data.debitNoteId}`,
      );
      return { status: 'posted', entryId: entry.id };
    } catch (err) {
      this.logger.error('Failed to process debit-note-posted hook', err as any);
      throw err;
    }
  }
}
