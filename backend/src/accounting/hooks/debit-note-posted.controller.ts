import { Body, Controller, HttpCode, Post, Logger, UseGuards } from '@nestjs/common';
import { DebitNotePostedDto } from './dto/debit-note-posted.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntriesService } from '../entries.service';
import { format } from 'date-fns';
import { DebitNoteAccountingService } from '../services/debit-note-accounting.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { IGV_FACTOR } from '../accounting.constants';

@Controller('accounting/hooks/debit-note-posted')
// FIXME: Guards disabled — hooks llamados internamente sin headers de auth.
// Re-habilitar cuando AccountingHookService propague JWT en llamadas internas.
// @UseGuards(JwtAuthGuard, TenantRequiredGuard)
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
      const igv = debitNote.igv ?? +(total - total / IGV_FACTOR).toFixed(2);
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
