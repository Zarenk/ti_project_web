import { Injectable } from '@nestjs/common';
import { EntryLine } from '../entries.service';

export interface DebitNoteEntryLine extends EntryLine {}

interface DebitNoteData {
  total: number;
  igv: number;
  provider?: { name?: string } | null;
}

@Injectable()
export class DebitNoteAccountingService {
  buildEntryFromDebitNote(note: DebitNoteData): DebitNoteEntryLine[] {
    const subtotal = +(note.total - note.igv).toFixed(2);
    return [
      {
        account: '2011',
        description: 'Mercaderías',
        debit: subtotal,
        credit: 0,
      },
      {
        account: '4011',
        description: 'IGV crédito fiscal',
        debit: note.igv,
        credit: 0,
      },
      {
        account: '4212',
        description: `Cuentas por pagar ${note.provider?.name ?? ''}`.trim(),
        debit: 0,
        credit: note.total,
      },
    ];
  }
}

export { DebitNoteData };