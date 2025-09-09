import { SaleAccountingService, aggregateSaleLines, SaleEntryLine } from './sale-accounting.service';

describe('SaleAccountingService', () => {
  it('aggregates duplicate lines by account and description', () => {
    const lines: SaleEntryLine[] = [
      {
        account: '1011',
        description: 'Cobro F001-1 – Caja',
        debit: 100,
        credit: 0,
      },
      {
        account: '1011',
        description: 'Cobro F001-1 – Caja',
        debit: 50,
        credit: 0,
      },
      {
        account: '7011',
        description: 'Venta F001-1 – Prod',
        debit: 0,
        credit: 80,
      },
    ];

    const aggregated = aggregateSaleLines(lines);
    expect(aggregated).toHaveLength(2);
    const cobro = aggregated.find((l) => l.account === '1011');
    expect(cobro?.debit).toBe(150);
  });

  it('buildEntryFromSale generates base entry lines', () => {
    const service = new SaleAccountingService();
    const sale = {
      total: 118,
      salesDetails: [
        {
          entryDetail: { price: 50, product: { name: 'Prod' } },
          quantity: 1,
        },
      ],
      invoices: [{ serie: 'F001', nroCorrelativo: '1' }],
      payments: [{ paymentMethod: { name: 'Caja' } }],
    };

    const lines = service.buildEntryFromSale(sale);
    expect(lines).toHaveLength(5);
    const cobro = lines.find((l) => l.account === '1011');
    expect(cobro?.debit).toBe(118);
  });
});
