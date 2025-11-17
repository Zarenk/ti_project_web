import { Injectable } from '@nestjs/common';
import { EntryLine } from '../entries.service';

export interface PurchaseEntryLine extends EntryLine {}

export interface PurchaseData {
  total: number;
  provider?: { name?: string } | null;
  isCredit?: boolean;
}

const round2 = (n: number) => Number(n.toFixed(2));

@Injectable()
export class PurchaseAccountingService {
  buildEntryFromPurchase(purchase: PurchaseData): PurchaseEntryLine[] {
    const total = round2(purchase.total || 0);
    const subtotal = round2(total / 1.18);
    const igv = round2(total - subtotal);

    const creditAccount = purchase.isCredit ? '4211' : '1011';
    const creditDescription = purchase.isCredit
      ? `Cuentas por pagar ${purchase.provider?.name ?? ''}`.trim()
      : 'Caja';

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
        debit: igv,
        credit: 0,
      },
      {
        account: creditAccount,
        description: creditDescription,
        debit: 0,
        credit: total,
      },
    ];
  }
}
