import { SalePostedController } from './sale-posted.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JournalEntryService } from '../services/journal-entry.service';
import { SaleAccountingService } from '../services/sale-accounting.service';
import { AccountBootstrapService } from '../services/account-bootstrap.service';

describe('SalePostedController', () => {
  const timestamp = new Date().toISOString();
  const mockRes = {} as any;
  const mockTenant = {
    organizationId: 1,
    companyId: 1,
    organizationUnitId: null,
    userId: null,
    isGlobalSuperAdmin: false,
    isOrganizationSuperAdmin: false,
    isSuperAdmin: false,
    allowedOrganizationIds: [1],
    allowedCompanyIds: [1],
    allowedOrganizationUnitIds: [],
  };

  function buildController(overrides: {
    sale?: any;
    accounts?: any[];
    existingEntry?: any;
    createdEntry?: any;
    lines?: any[];
  } = {}) {
    const sale = 'sale' in overrides ? overrides.sale : {
      id: 1,
      total: 118,
      organizationId: 1,
      companyId: 1,
      clientId: 1,
      salesDetails: [
        { entryDetail: { product: { name: 'Producto A' }, price: 50 }, quantity: 2 },
      ],
      payments: [{ paymentMethod: { name: 'Efectivo' } }],
      invoices: [{ serie: 'F001', nroCorrelativo: '00001', tipoMoneda: 'PEN' }],
    };

    const prisma = {
      sales: { findUnique: jest.fn().mockResolvedValue(sale) },
      journalEntry: {
        findFirst: jest.fn().mockResolvedValue(overrides.existingEntry ?? null),
      },
      account: {
        findMany: jest.fn().mockResolvedValue(
          overrides.accounts ?? [
            { id: 10, code: '1041' },
            { id: 20, code: '7011' },
            { id: 30, code: '4011' },
            { id: 40, code: '6911' },
            { id: 50, code: '2011' },
          ],
        ),
      },
      client: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Cliente Test' }),
      },
    } as unknown as PrismaService;

    const journalEntryService = {
      create: jest.fn().mockResolvedValue(
        overrides.createdEntry ?? { id: 10, status: 'POSTED' },
      ),
    } as unknown as JournalEntryService;

    const mapper = {
      buildEntryFromSale: jest.fn().mockReturnValue(
        overrides.lines ?? [
          { account: '1041', description: 'Cobro venta', debit: 118, credit: 0 },
          { account: '7011', description: 'Venta', debit: 0, credit: 100 },
          { account: '4011', description: 'IGV 18%', debit: 0, credit: 18 },
        ],
      ),
    } as unknown as SaleAccountingService;

    const bootstrap = {
      ensureDefaults: jest.fn().mockResolvedValue(undefined),
    } as unknown as AccountBootstrapService;

    const controller = new SalePostedController(
      prisma,
      journalEntryService,
      mapper,
      bootstrap,
    );

    return { controller, prisma, journalEntryService, mapper, bootstrap };
  }

  it('creates a journal entry for a new sale', async () => {
    const { controller, journalEntryService, bootstrap } = buildController();

    const result = await controller.handle(
      { saleId: 1, timestamp },
      mockRes,
      mockTenant as any,
    );

    expect(result).toEqual({ status: 'posted', entryId: 10 });
    expect(bootstrap.ensureDefaults).toHaveBeenCalledWith(1);
    expect(journalEntryService.create).toHaveBeenCalledTimes(1);

    const createCall = (journalEntryService.create as jest.Mock).mock.calls[0][0];
    expect(createCall.source).toBe('SALE');
    expect(createCall.moneda).toBe('PEN');
    expect(createCall.lines).toHaveLength(3);
  });

  it('returns duplicate when journal entry already exists for invoice', async () => {
    const { controller, journalEntryService } = buildController({
      existingEntry: { id: 5, correlativo: '00001' },
    });

    const result = await controller.handle(
      { saleId: 1, timestamp },
      mockRes,
      mockTenant as any,
    );

    expect(result).toEqual({ status: 'duplicate' });
    expect(journalEntryService.create).not.toHaveBeenCalled();
  });

  it('returns not_found when sale does not exist', async () => {
    const { controller, journalEntryService } = buildController({ sale: null });

    const result = await controller.handle(
      { saleId: 999, timestamp },
      mockRes,
      mockTenant as any,
    );

    expect(result).toEqual({ status: 'not_found' });
    expect(journalEntryService.create).not.toHaveBeenCalled();
  });

  it('throws when required accounts are missing', async () => {
    const { controller } = buildController({ accounts: [] });

    await expect(
      controller.handle({ saleId: 1, timestamp }, mockRes, mockTenant as any),
    ).rejects.toThrow('Cuentas contables no encontradas');
  });
});
