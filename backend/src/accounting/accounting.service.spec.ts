import { AccountingService } from './accounting.service';

describe('AccountingService.createJournalForInventoryEntry', () => {
  const setup = (entryOverrides: any = {}) => {
    const entry = {
      id: 1,
      date: '2024-09-23T21:55:00.000Z',
      details: [
        {
          quantity: 2,
          priceInSoles: 59,
          price: 59,
          product: { name: 'Prod' },
          series: [],
        },
      ],
      invoice: { serie: 'F001', nroCorrelativo: '1' },
      provider: { name: 'Prov' },
      igvRate: 0.18,
      organizationId: null,
      store: { companyId: null, organizationId: null },
      ...entryOverrides,
    };

    const accEntryCreate = jest.fn();
    const prisma = {
      $transaction: async (fn: any) => fn(prisma),
      entry: { findUnique: jest.fn().mockResolvedValue(entry) },
      accEntry: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: accEntryCreate,
      },
      provider: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
      accPeriod: {
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
        create: jest.fn(),
      },
    } as any;

    return { service: new AccountingService(prisma), prisma };
  };

  it('handles cash payments', async () => {
    const { service, prisma } = setup({
      paymentTerm: 'CASH',
      paymentMethod: 'EFECTIVO',
      totalGross: undefined,
    });
    await service.createJournalForInventoryEntry(1);

    const lines = prisma.accEntry.create.mock.calls[0][0].data.lines.create;
    const igvLine = lines.find((l: any) => l.account === '4011');
    expect(igvLine.debit).toBe(18);
    expect(igvLine.credit).toBe(0);

    const netLine = lines.find((l: any) => l.account === '2011');
    expect(netLine.debit).toBe(100);

    const payLine = lines.find(
      (l: any) => !['2011', '4011'].includes(l.account),
    );
    expect(payLine.account).toBe('1011');
    expect(payLine.credit).toBe(118);
    expect(payLine.description).toBe('Pago Compra F001-1');
  });

  it('handles credit payments', async () => {
    const { service, prisma } = setup({
      paymentTerm: 'CREDIT',
      paymentMethod: 'EFECTIVO',
      totalGross: undefined,
    });
    await service.createJournalForInventoryEntry(1);

    const lines = prisma.accEntry.create.mock.calls[0][0].data.lines.create;
    const payLine = lines.find(
      (l: any) => !['2011', '4011'].includes(l.account),
    );
    expect(payLine.account).toBe('4211');
    expect(payLine.description).toBe('Pago Compra F001-1');
  });

  it('handles transfer payments', async () => {
    const { service, prisma } = setup({
      paymentTerm: 'CASH',
      paymentMethod: 'TRANSFERENCIA',
      totalGross: undefined,
    });
    await service.createJournalForInventoryEntry(1);

    const lines = prisma.accEntry.create.mock.calls[0][0].data.lines.create;
    const payLine = lines.find(
      (l: any) => !['2011', '4011'].includes(l.account),
    );
    expect(payLine.account).toBe('1041');
    expect(payLine.description).toBe('Pago Compra F001-1');

    expect(prisma.accEntry.count).toHaveBeenCalledWith({
      where: { periodId: 1, serie: 'F001', correlativo: '1' },
    });
  });

  it('appends duplicate suffix when invoice already exists in period', async () => {
    const { service, prisma } = setup();
    prisma.accEntry.count.mockResolvedValue(1);

    await service.createJournalForInventoryEntry(1);

    const lines = prisma.accEntry.create.mock.calls[0][0].data.lines.create;
    const inventoryLine = lines.find((l: any) => l.account === '2011');
    const paymentLine = lines.find(
      (l: any) => !['2011', '4011'].includes(l.account),
    );

    expect(inventoryLine.description).toContain('Registro 2');
    expect(paymentLine.description).toContain('Registro 2');
  });
});
