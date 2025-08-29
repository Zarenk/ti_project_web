import { Injectable } from '@nestjs/common';
import { EntryLine } from '../entries.service';

interface SaleEntryLine extends EntryLine {
  igv?: boolean;
  cogs?: boolean;
}

@Injectable()
export class SaleAccountingService {
  buildEntryFromSale(sale: any): SaleEntryLine[] {
    const subtotal = +(sale.total / 1.18).toFixed(2);
    const igv = +(sale.total - subtotal).toFixed(2);
    const cost = (sale.salesDetails || []).reduce(
      (sum: number, d: any) => sum + (d.entryDetail?.price ?? 0) * d.quantity,
      0,
    );

    const lines: SaleEntryLine[] = [
      { account: '1011', description: 'Caja', debit: sale.total, credit: 0 },
      { account: '7011', description: 'Ventas', debit: 0, credit: subtotal },
      {
        account: '4011',
        description: 'IGV por pagar',
        debit: 0,
        credit: igv,
        igv: true,
      },
      {
        account: '6911',
        description: 'Costo de ventas',
        debit: cost,
        credit: 0,
        cogs: true,
      },
      {
        account: '2011',
        description: 'Mercaderías',
        debit: 0,
        credit: cost,
      },
    ];

    return lines;
  }
}

export { SaleEntryLine };