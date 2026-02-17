import { PurchasePostedController } from './purchase-posted.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JournalEntryService } from '../services/journal-entry.service';
import { PurchaseAccountingService } from '../services/purchase-account.service';
import { AccountBootstrapService } from '../services/account-bootstrap.service';

describe('PurchasePostedController', () => {
  const timestamp = new Date().toISOString();
  const mockTenant = {
    organizationId: 1,
    companyId: null,
    organizationUnitId: null,
    userId: null,
    isGlobalSuperAdmin: false,
    isOrganizationSuperAdmin: false,
    isSuperAdmin: false,
    allowedOrganizationIds: [1],
    allowedCompanyIds: [],
    allowedOrganizationUnitIds: [],
  };

  function buildController(overrides: {
    purchase?: any;
    accounts?: any[];
    existingEntry?: any;
    createdEntry?: any;
    lines?: any[];
    productDetails?: any[];
  } = {}) {
    const purchase = 'purchase' in overrides ? overrides.purchase : {
      id: 1,
      organizationId: 1,
      details: [{ price: 50, priceInSoles: 118, quantity: 1 }],
      invoice: { serie: 'F001', nroCorrelativo: '00001' },
      provider: { id: 1, name: 'Proveedor Test' },
    };

    const prisma = {
      entry: { findUnique: jest.fn().mockResolvedValue(purchase) },
      journalEntry: {
        findFirst: jest.fn().mockResolvedValue(overrides.existingEntry ?? null),
      },
      entryDetail: {
        findMany: jest.fn().mockResolvedValue(
          overrides.productDetails ?? [
            {
              quantity: 1,
              price: 118,
              priceInSoles: 118,
              product: { name: 'Producto A' },
              series: [],
            },
          ],
        ),
      },
      account: {
        findMany: jest.fn().mockResolvedValue(
          overrides.accounts ?? [
            { id: 10, code: '2011' },
            { id: 20, code: '4011' },
            { id: 30, code: '4212' },
          ],
        ),
      },
    } as unknown as PrismaService;

    const journalEntryService = {
      create: jest.fn().mockResolvedValue(
        overrides.createdEntry ?? { id: 10, status: 'POSTED' },
      ),
    } as unknown as JournalEntryService;

    const mapper = {
      buildEntryFromPurchase: jest.fn().mockReturnValue(
        overrides.lines ?? [
          { account: '2011', description: 'Inventario', debit: 100, credit: 0 },
          { account: '4011', description: 'IGV', debit: 18, credit: 0 },
          { account: '4212', description: 'CxP', debit: 0, credit: 118 },
        ],
      ),
    } as unknown as PurchaseAccountingService;

    const bootstrap = {
      ensureDefaults: jest.fn().mockResolvedValue(undefined),
    } as unknown as AccountBootstrapService;

    const controller = new PurchasePostedController(
      prisma,
      journalEntryService,
      mapper,
      bootstrap,
    );

    return { controller, prisma, journalEntryService, mapper, bootstrap };
  }

  it('creates a journal entry with source PURCHASE using priceInSoles', async () => {
    const { controller, journalEntryService, mapper, bootstrap } = buildController();

    const result = await controller.handle(
      { purchaseId: 1, timestamp },
      mockTenant as any,
    );

    expect(result).toEqual({ status: 'posted', entryId: 10 });
    expect(bootstrap.ensureDefaults).toHaveBeenCalledWith(1);
    expect(mapper.buildEntryFromPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ total: 118 }),
    );
    expect(journalEntryService.create).toHaveBeenCalledTimes(1);

    const createCall = (journalEntryService.create as jest.Mock).mock.calls[0][0];
    expect(createCall.source).toBe('PURCHASE');
    expect(createCall.moneda).toBe('PEN');
    expect(createCall.lines).toHaveLength(3);
  });

  it('uses price when priceInSoles is missing', async () => {
    const { controller, mapper } = buildController({
      purchase: {
        id: 2,
        organizationId: 1,
        details: [{ price: 118, quantity: 1 }],
        invoice: { serie: 'F001', nroCorrelativo: '00002' },
        provider: null,
      },
    });

    await controller.handle({ purchaseId: 2, timestamp }, mockTenant as any);

    expect(mapper.buildEntryFromPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ total: 118, provider: null }),
    );
  });

  it('returns not_found when purchase does not exist', async () => {
    const { controller, journalEntryService } = buildController({ purchase: null });

    const result = await controller.handle(
      { purchaseId: 999, timestamp },
      mockTenant as any,
    );

    expect(result).toEqual({ status: 'not_found' });
    expect(journalEntryService.create).not.toHaveBeenCalled();
  });

  it('returns unbalanced when mapper output is not balanced', async () => {
    const { controller, journalEntryService } = buildController({
      lines: [
        { account: '2011', description: 'Inventario', debit: 100, credit: 0 },
        { account: '4212', description: 'CxP', debit: 0, credit: 117 },
      ],
    });

    const result = await controller.handle(
      { purchaseId: 1, timestamp },
      mockTenant as any,
    );

    expect(result).toEqual({ status: 'unbalanced' });
    expect(journalEntryService.create).not.toHaveBeenCalled();
  });

  it('returns duplicate when journal entry already exists for invoice', async () => {
    const { controller, journalEntryService } = buildController({
      existingEntry: { id: 5, correlativo: '00001' },
    });

    const result = await controller.handle(
      { purchaseId: 1, timestamp },
      mockTenant as any,
    );

    expect(result).toEqual({ status: 'duplicate' });
    expect(journalEntryService.create).not.toHaveBeenCalled();
  });
});
