import { Injectable } from '@nestjs/common';
import { EntryLine } from '../entries.service';

export interface PurchaseEntryLine extends EntryLine {}

interface PurchaseData {
  total: number;
  igv: number;
  provider?: { name?: string } | null;
}

@Injectable()
export class PurchaseAccountingService {
  buildEntryFromPurchase(purchase: PurchaseData): PurchaseEntryLine[] {
    const subtotal = +(purchase.total - purchase.igv).toFixed(2);

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
        debit: purchase.igv,
        credit: 0,
      },
      {
        account: '4212',
        description: `Cuentas por pagar ${purchase.provider?.name ?? ''}`.trim(),
        debit: 0,
        credit: purchase.total,
      },
    ];
  }
}
