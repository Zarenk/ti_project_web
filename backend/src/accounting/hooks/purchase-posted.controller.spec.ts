import { PurchasePostedController } from './purchase-posted.controller';
import { EntriesService } from '../entries.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PurchaseAccountingService } from '../services/purcharse-account.service';

describe('PurchasePostedController', () => {
  const timestamp = new Date().toISOString();

  it('normalizes amounts using priceInSoles when present', async () => {
    const purchase = {
      id: 1,
      details: [{ price: 50, priceInSoles: 118, quantity: 1 }],
      invoice: { serie: 'F001', nroCorrelativo: '1' },
      provider: { id: 1, name: 'Proveedor' },
    };
    const prisma = {
      entry: { findUnique: jest.fn().mockResolvedValue(purchase) },
    } as unknown as PrismaService;

    const entries = {
      createDraft: jest.fn().mockResolvedValue({ id: 10 }),
      post: jest.fn(),
    } as unknown as EntriesService;

    const mapper = {
      buildEntryFromPurchase: jest.fn().mockReturnValue([
        { account: '2011', debit: 100, credit: 0 },
        { account: '4011', debit: 18, credit: 0 },
        { account: '4212', debit: 0, credit: 118 },
      ]),
    } as unknown as PurchaseAccountingService;

    const controller = new PurchasePostedController(prisma, entries, mapper);
    const result = await controller.handle({ purchaseId: 1, timestamp });

    expect(mapper.buildEntryFromPurchase).toHaveBeenCalledWith({
      subtotal: 100,
      igv: 18,
      provider: purchase.provider,
    });
    expect(entries.createDraft).toHaveBeenCalled();
    expect(entries.post).toHaveBeenCalledWith(10);
    expect(result).toEqual({ status: 'posted', entryId: 10 });
  });

  it('normalizes amounts using price when priceInSoles is missing', async () => {
    const purchase = {
      id: 1,
      details: [{ price: 118, quantity: 1 }],
      invoice: { serie: 'F001', nroCorrelativo: '2' },
      provider: null,
    };
    const prisma = {
      entry: { findUnique: jest.fn().mockResolvedValue(purchase) },
    } as unknown as PrismaService;

    const entries = {
      createDraft: jest.fn().mockResolvedValue({ id: 20 }),
      post: jest.fn(),
    } as unknown as EntriesService;

    const mapper = {
      buildEntryFromPurchase: jest.fn().mockReturnValue([
        { account: '2011', debit: 100, credit: 0 },
        { account: '4011', debit: 18, credit: 0 },
        { account: '4212', debit: 0, credit: 118 },
      ]),
    } as unknown as PurchaseAccountingService;

    const controller = new PurchasePostedController(prisma, entries, mapper);
    const result = await controller.handle({ purchaseId: 1, timestamp });

    expect(mapper.buildEntryFromPurchase).toHaveBeenCalledWith({
      subtotal: 100,
      igv: 18,
      provider: null,
    });
    expect(entries.createDraft).toHaveBeenCalled();
    expect(result).toEqual({ status: 'posted', entryId: 20 });
  });

  it('returns unbalanced when mapper output is not balanced', async () => {
    const purchase = {
      id: 1,
      details: [{ price: 118, quantity: 1 }],
      invoice: { serie: 'F001', nroCorrelativo: '3' },
      provider: null,
    };
    const prisma = {
      entry: { findUnique: jest.fn().mockResolvedValue(purchase) },
    } as unknown as PrismaService;

    const entries = {
      createDraft: jest.fn(),
      post: jest.fn(),
    } as unknown as EntriesService;

    const mapper = {
      buildEntryFromPurchase: jest.fn().mockReturnValue([
        { account: '2011', debit: 100, credit: 0 },
        { account: '4212', debit: 0, credit: 117 },
      ]),
    } as unknown as PurchaseAccountingService;

    const controller = new PurchasePostedController(prisma, entries, mapper);
    const result = await controller.handle({ purchaseId: 1, timestamp });

    expect(result).toEqual({ status: 'unbalanced' });
    expect(entries.createDraft).not.toHaveBeenCalled();
    expect(entries.post).not.toHaveBeenCalled();
  });
});
