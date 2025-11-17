import { Injectable } from '@nestjs/common';
import { EntryLine } from '../entries.service';

export type CreditNoteEntryLine = EntryLine;

interface CreditNoteData {
  total: number;
  igv: number;
}

@Injectable()
export class CreditNoteAccountingService {
  buildEntryFromCreditNote(note: CreditNoteData): CreditNoteEntryLine[] {
    const subtotal = +(note.total - note.igv).toFixed(2);
    return [
      {
        account: '7011',
        description: 'Ventas',
        debit: subtotal,
        credit: 0,
      },
      {
        account: '4011',
        description: 'IGV por pagar',
        debit: note.igv,
        credit: 0,
      },
      {
        account: '1011',
        description: 'Caja',
        debit: 0,
        credit: note.total,
      },
    ];
  }
}

export { CreditNoteData };
