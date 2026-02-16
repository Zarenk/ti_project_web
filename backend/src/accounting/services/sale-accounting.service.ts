import { Injectable } from '@nestjs/common';
import { EntryLine } from '../entries.service';

interface SaleEntryLine extends EntryLine {
  igv?: boolean;
  cogs?: boolean;
}

function aggregateSaleLines(lines: SaleEntryLine[]): SaleEntryLine[] {
  const aggregated = new Map<string, SaleEntryLine>();
  for (const line of lines) {
    const key = `${line.account}|${line.description}`;
    const current = aggregated.get(key);
    if (current) {
      current.debit += line.debit;
      current.credit += line.credit;
      if (line.quantity != null || current.quantity != null) {
        current.quantity = (current.quantity ?? 0) + (line.quantity ?? 0);
      }
    } else {
      aggregated.set(key, { ...line });
    }
  }
  return Array.from(aggregated.values());
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
    const totalQty = (sale.salesDetails || []).reduce(
      (s: number, d: any) => s + d.quantity,
      0,
    );

    const invoice = sale.invoices?.[0];
    const invoiceCode = invoice
      ? `${invoice.serie}-${invoice.nroCorrelativo}`
      : '';
    const paymentMethod = sale.payments?.[0]?.paymentMethod?.name ?? '';
    const accountCode = /yape|transfer/i.test(paymentMethod) ? '1041' : '1011';

    // Construir descripción detallada de productos
    const productsDetail = (sale.salesDetails || [])
      .map((d: any) => {
        const productName = d.entryDetail?.product?.name || 'Producto';
        const qty = d.quantity;
        const price = d.price || 0;
        return `${qty}x ${productName} @S/${price.toFixed(2)}`;
      })
      .join(' | ');

    const lines: SaleEntryLine[] = [
      {
        account: accountCode,
        description: `Cobro ${invoiceCode} – ${paymentMethod || 'Caja'}`.trim(),
        debit: sale.total,
        credit: 0,
        quantity: null,
      },
      {
        account: '7011',
        description: `Venta ${invoiceCode}: ${productsDetail}`.trim(),
        debit: 0,
        credit: subtotal,
        quantity: null,
      },
      {
        account: '4011',
        description: `IGV 18% Venta ${invoiceCode}`.trim(),
        debit: 0,
        credit: igv,
        igv: true,
        quantity: null,
      },
      {
        account: '6911',
        description: `Costo de ventas: ${productsDetail}`.trim(),
        debit: cost,
        credit: 0,
        cogs: true,
        quantity: totalQty,
      },
      {
        account: '2011',
        description: `Salida mercaderías: ${productsDetail}`.trim(),
        debit: 0,
        credit: cost,
        quantity: totalQty,
      },
    ];

    return aggregateSaleLines(lines);
  }
}

export { SaleEntryLine, aggregateSaleLines };
