import { SalePostedController } from './sale-posted.controller';
import { EntriesService } from '../entries.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SaleAccountingService } from '../services/sale-accounting.service';

describe('SalePostedController', () => {
  it('creates only one entry for duplicate invoices', async () => {
    const sale = {
      id: 1,
      total: 100,
      salesDetails: [],
      payments: [],
      invoices: [{ serie: 'F001', nroCorrelativo: '1' }],
    };
    const prisma = {
      sales: { findUnique: jest.fn().mockResolvedValue(sale) },
    } as unknown as PrismaService;

    const entries = {
      findByInvoice: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1 }),
      createDraft: jest.fn().mockResolvedValue({ id: 10 }),
      post: jest.fn(),
    } as unknown as EntriesService;

    const mapper = {
      buildEntryFromSale: jest
        .fn()
        .mockReturnValue([
          { account: '1011', description: '', debit: 100, credit: 0 },
        ]),
    } as unknown as SaleAccountingService;

    const controller = new SalePostedController(prisma, entries, mapper);

    const dto = { saleId: 1, timestamp: new Date().toISOString() };
    const first = await controller.handle(dto);
    const second = await controller.handle(dto);

    expect(first).toEqual({ status: 'posted', entryId: 10 });
    expect(second).toEqual({ status: 'duplicate' });
    expect((entries as any).createDraft).toHaveBeenCalledTimes(1);
    expect((entries as any).post).toHaveBeenCalledTimes(1);
    expect((entries as any).findByInvoice).toHaveBeenCalledTimes(2);
  });
});
