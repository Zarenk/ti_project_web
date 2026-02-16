import { Injectable } from '@nestjs/common';
import { EntryLine } from '../entries.service';

export interface PurchaseEntryLine extends EntryLine {}

export interface PurchaseProduct {
  quantity: number;
  name: string;
  price: number;
  series?: string;
}

export interface PurchaseData {
  total: number;
  provider?: { name?: string } | null;
  isCredit?: boolean;
  products?: PurchaseProduct[];
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

    // Construir descripción detallada de mercaderías
    let merchandiseDescription = 'Mercaderías';
    if (purchase.products && purchase.products.length > 0) {
      const itemsDetail = purchase.products
        .map(p => {
          const seriesInfo = p.series ? ` S/N:${p.series}` : '';
          return `${p.quantity}x ${p.name} @S/${p.price.toFixed(2)}${seriesInfo}`;
        })
        .join(' | ');
      merchandiseDescription = `Mercaderías: ${itemsDetail}`;
    }

    return [
      {
        account: '2011',
        description: merchandiseDescription,
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
