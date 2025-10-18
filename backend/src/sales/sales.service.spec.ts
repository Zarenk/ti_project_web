import { SalesService } from './sales.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { executeSale, prepareSaleContext } from 'src/utils/sales-helper';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

jest.mock('src/utils/sales-helper', () => ({
  executeSale: jest.fn(),
  prepareSaleContext: jest.fn(),
}));

jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

type PrismaMock = {
  storeOnInventory: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  salePayment: {
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  user: { findUnique: jest.Mock };
  sales: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    delete: jest.Mock;
    aggregate: jest.Mock;
  };
  inventoryHistory: { create: jest.Mock };
  entryDetailSeries: { updateMany: jest.Mock };
  cashTransactionPaymentMethod: { deleteMany: jest.Mock };
  cashRegister: { update: jest.Mock };
  cashTransaction: { delete: jest.Mock };
  invoiceSales: { deleteMany: jest.Mock };
  orders: { update: jest.Mock };
  shippingGuide: { updateMany: jest.Mock };
  $transaction: jest.Mock;
  salesDetail: { findMany: jest.Mock };
  product: { findMany: jest.Mock };
};

describe('SalesService multi-organization support', () => {
  let service: SalesService;
  let prisma: PrismaMock;
  let prismaService: PrismaService;
  let activityService: { log: jest.Mock };
  let accountingHook: { postSale: jest.Mock; postPayment: jest.Mock };

  const baseSaleInput = {
    userId: 10,
    storeId: 20,
    clientId: 30,
    total: 100,
    description: 'Test sale',
    details: [
      { productId: 1, quantity: 2, price: 50 },
    ],
    tipoComprobante: 'BOL',
    tipoMoneda: 'PEN',
    payments: [
      { paymentMethodId: 1, amount: 100, currency: 'PEN' },
    ],
  };

  beforeEach(() => {
    prisma = {
      storeOnInventory: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, stock: 10 }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      salePayment: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ username: 'seller@example.com' }),
      },
      sales: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { total: 0 } }),
      },
      inventoryHistory: {
        create: jest.fn(),
      },
      entryDetailSeries: {
        updateMany: jest.fn(),
      },
      cashTransactionPaymentMethod: {
        deleteMany: jest.fn(),
      },
      cashRegister: {
        update: jest.fn(),
      },
      cashTransaction: {
        delete: jest.fn(),
      },
      invoiceSales: {
        deleteMany: jest.fn(),
      },
      orders: {
        update: jest.fn(),
      },
      shippingGuide: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
      salesDetail: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    activityService = { log: jest.fn().mockResolvedValue(undefined) };
    accountingHook = {
      postSale: jest.fn().mockResolvedValue(undefined),
      postPayment: jest.fn().mockResolvedValue(undefined),
    };

    (prepareSaleContext as jest.Mock).mockReset();
    (executeSale as jest.Mock).mockReset();
    (logOrganizationContext as jest.Mock).mockReset();

    prismaService = prisma as unknown as PrismaService;

    service = new SalesService(
      prismaService,
      activityService as unknown as ActivityService,
      accountingHook as unknown as AccountingHook,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('propagates the provided organizationId to executeSale and logging', async () => {
    (prepareSaleContext as jest.Mock).mockResolvedValue({
      store: { id: baseSaleInput.storeId, name: 'Store', organizationId: 321 },
      cashRegister: { id: 99 },
      clientIdToUse: baseSaleInput.clientId,
    });

    (executeSale as jest.Mock).mockResolvedValue({ id: 123, total: 100 });

    await service.createSale({
      ...baseSaleInput,
      organizationId: 321,
    });

    expect(prepareSaleContext).toHaveBeenCalledWith(
      prismaService,
      baseSaleInput.storeId,
      baseSaleInput.clientId,
    );

    expect(executeSale).toHaveBeenCalledWith(
      prismaService,
      expect.objectContaining({
        organizationId: 321,
      }),
    );

    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'SalesService',
        operation: 'createSale',
        organizationId: 321,
      }),
    );
  });

  it('falls back to the store organizationId when not provided', async () => {
    (prepareSaleContext as jest.Mock).mockResolvedValue({
      store: { id: baseSaleInput.storeId, name: 'Store', organizationId: 654 },
      cashRegister: { id: 99 },
      clientIdToUse: baseSaleInput.clientId,
    });

    (executeSale as jest.Mock).mockResolvedValue({ id: 456, total: 100 });

    await service.createSale(baseSaleInput);

    expect(executeSale).toHaveBeenCalledWith(
      prismaService,
      expect.objectContaining({
        organizationId: 654,
      }),
    );

    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 654,
      }),
    );
  });

  it('defaults organizationId to null when both input and store values are missing', async () => {
    (prepareSaleContext as jest.Mock).mockResolvedValue({
      store: { id: baseSaleInput.storeId, name: 'Store', organizationId: null },
      cashRegister: { id: 99 },
      clientIdToUse: baseSaleInput.clientId,
    });

    (executeSale as jest.Mock).mockResolvedValue({ id: 789, total: 100 });

    await service.createSale(baseSaleInput);

    expect(executeSale).toHaveBeenCalledWith(
      prismaService,
      expect.objectContaining({
        organizationId: null,
      }),
    );

    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: null,
      }),
    );
  });
  
  it('rejects mismatching organizationId between payload and store', async () => {
    (prepareSaleContext as jest.Mock).mockResolvedValue({
      store: { id: baseSaleInput.storeId, name: 'Store', organizationId: 999 },
      cashRegister: { id: 99 },
      clientIdToUse: baseSaleInput.clientId,
    });

    await expect(
      service.createSale({
        ...baseSaleInput,
        organizationId: 123,
      }),
    ).rejects.toThrow('La organización proporcionada no coincide con la tienda seleccionada.');
  });

  it('applies organization filters when listing sales', async () => {
    const findMany = prisma.sales.findMany;
    findMany.mockResolvedValueOnce([]);

    await service.findAllSales(55);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 55 },
      }),
    );
  });

  it('keeps legacy listing behavior when organizationId is undefined', async () => {
    const findMany = prisma.sales.findMany;
    findMany.mockResolvedValueOnce([]);

    await service.findAllSales();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it('propagates the organization filter to monthly totals aggregation', async () => {
    const aggregate = prisma.sales.aggregate;
    aggregate
      .mockResolvedValueOnce({ _sum: { total: 1500 } })
      .mockResolvedValueOnce({ _sum: { total: 500 } });

    const result = await service.getMonthlySalesTotal(99);

    expect(aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 99 }),
      }),
    );
    expect(aggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 99 }),
      }),
    );
    expect(result.total).toBe(1500);
  });

  it('keeps monthly totals compatible with legacy data when organizationId is undefined', async () => {
    const aggregate = prisma.sales.aggregate;
    aggregate
      .mockResolvedValueOnce({ _sum: { total: 300 } })
      .mockResolvedValueOnce({ _sum: { total: 100 } });

    await service.getMonthlySalesTotal();

    const firstCallWhere = aggregate.mock.calls[0][0].where;
    const secondCallWhere = aggregate.mock.calls[1][0].where;

    expect(firstCallWhere).not.toHaveProperty('organizationId');
    expect(secondCallWhere).not.toHaveProperty('organizationId');
  });

  it('filters revenue by category using the provided organizationId', async () => {
    const startDate = new Date('2024-01-01T00:00:00.000Z');
    const endDate = new Date('2024-01-31T23:59:59.000Z');
    prisma.sales.findMany.mockResolvedValueOnce([{ id: 123 }]);
    prisma.salesDetail.findMany.mockResolvedValueOnce([
      { productId: 10, quantity: 2, price: 50 },
    ]);
    prisma.product.findMany.mockResolvedValueOnce([
      { id: 10, category: { name: 'Electrónicos' } },
    ]);

    const result = await service.getRevenueByCategory(startDate, endDate, 77);

    expect(prisma.sales.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 77 }),
      }),
    );
    expect(prisma.salesDetail.findMany).toHaveBeenCalledWith({
      where: { salesId: { in: [123] } },
    });
    expect(result).toEqual([{ name: 'Electrónicos', value: 100 }]);
  });

  it('applies organization filters when retrieving sales transactions', async () => {
    const saleDate = new Date('2024-02-15T10:00:00.000Z');
    prisma.sales.findMany.mockResolvedValueOnce([
      {
        id: 987,
        createdAt: saleDate,
        total: 250,
        tipoMoneda: 'PEN',
        client: { name: 'Alpha Cliente' },
        invoices: [
          { serie: 'F001', nroCorrelativo: '000123', tipoComprobante: 'FACTURA' },
        ],
        payments: [
          {
            amount: 250,
            currency: 'PEN',
            paymentMethod: { name: 'Tarjeta' },
          },
        ],
        salesDetails: [
          {
            quantity: 1,
            price: 250,
            entryDetail: {
              price: 180,
              product: { name: 'Alpha Laptop 13"' },
              series: [{ serial: 'ALPHA-001' }],
            },
          },
        ],
      },
    ]);

    const result = await service.getSalesTransactions(undefined, undefined, 44);

    expect(prisma.sales.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 44 } }),
    );
    expect(result).toEqual([
      {
        date: saleDate,
        serie: 'F001',
        correlativo: '000123',
        tipoComprobante: 'FACTURA',
        customerName: 'Alpha Cliente',
        total: 250,
        payments: [{ method: 'Tarjeta', amount: 250 }],
        items: [
          {
            qty: 1,
            unitPrice: 250,
            costUnit: 180,
            productName: 'Alpha Laptop 13"',
            series: ['ALPHA-001'],
          },
        ],
      },
    ]);
  });
  
  describe('deleteSale', () => {
    it('propagates the organizationId to the inventory history when deleting a sale with tenant context', async () => {
      const sale = {
        id: 500,
        total: 200,
        userId: 42,
        organizationId: 77,
        store: { id: 9, name: 'Tenant Store' },
        client: { id: 10, name: 'Tenant Client', type: 'PERSON', typeNumber: 'TC-1' },
        salesDetails: [
          {
            storeOnInventoryId: 30,
            quantity: 2,
            price: 100,
            series: ['SER-001'],
            entryDetail: { product: { id: 5, name: 'Laptop' } },
          },
        ],
        payments: [],
        shippingGuides: [],
        order: null,
      };

      const inventoryRecord = {
        id: 30,
        inventoryId: 44,
        stock: 5,
      };

      const inventoryHistoryCreate = jest.fn().mockResolvedValue(undefined);

      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          sales: {
            findFirst: jest.fn().mockResolvedValue(sale),
            delete: jest.fn().mockResolvedValue({ id: sale.id }),
          },
          storeOnInventory: {
            findUnique: jest.fn().mockResolvedValue(inventoryRecord),
            update: jest.fn().mockResolvedValue(undefined),
          },
          inventoryHistory: { create: inventoryHistoryCreate },
          entryDetailSeries: { updateMany: jest.fn().mockResolvedValue(undefined) },
          salePayment: { deleteMany: jest.fn().mockResolvedValue(undefined) },
          shippingGuide: { updateMany: jest.fn().mockResolvedValue(undefined) },
          orders: { update: jest.fn().mockResolvedValue(undefined) },
          invoiceSales: { deleteMany: jest.fn().mockResolvedValue(undefined) },
          cashTransactionPaymentMethod: {
            deleteMany: jest.fn().mockResolvedValue(undefined),
          },
          cashRegister: { update: jest.fn().mockResolvedValue(undefined) },
          cashTransaction: { delete: jest.fn().mockResolvedValue(undefined) },
        }),
      );

      await service.deleteSale(sale.id, 88, sale.organizationId);

      expect(inventoryHistoryCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: sale.organizationId }),
      });
    });

    it('defaults organizationId to null when the sale belongs to legacy data', async () => {
      const sale = {
        id: 600,
        total: 75,
        userId: 11,
        organizationId: null,
        store: { id: 1, name: 'Legacy Store' },
        client: { id: 2, name: 'Legacy Client', type: 'PERSON', typeNumber: 'LC-1' },
        salesDetails: [
          {
            storeOnInventoryId: 15,
            quantity: 1,
            price: 75,
            series: [],
            entryDetail: { product: { id: 3, name: 'Mouse' } },
          },
        ],
        payments: [],
        shippingGuides: [],
        order: null,
      };

      const inventoryRecord = {
        id: 15,
        inventoryId: 22,
        stock: 8,
      };

      const inventoryHistoryCreate = jest.fn().mockResolvedValue(undefined);

      prisma.$transaction.mockImplementation(async (callback) =>
        callback({
          sales: {
            findFirst: jest.fn().mockResolvedValue(sale),
            delete: jest.fn().mockResolvedValue({ id: sale.id }),
          },
          storeOnInventory: {
            findUnique: jest.fn().mockResolvedValue(inventoryRecord),
            update: jest.fn().mockResolvedValue(undefined),
          },
          inventoryHistory: { create: inventoryHistoryCreate },
          entryDetailSeries: { updateMany: jest.fn().mockResolvedValue(undefined) },
          salePayment: { deleteMany: jest.fn().mockResolvedValue(undefined) },
          shippingGuide: { updateMany: jest.fn().mockResolvedValue(undefined) },
          orders: { update: jest.fn().mockResolvedValue(undefined) },
          invoiceSales: { deleteMany: jest.fn().mockResolvedValue(undefined) },
          cashTransactionPaymentMethod: {
            deleteMany: jest.fn().mockResolvedValue(undefined),
          },
          cashRegister: { update: jest.fn().mockResolvedValue(undefined) },
          cashTransaction: { delete: jest.fn().mockResolvedValue(undefined) },
        }),
      );

      await service.deleteSale(sale.id);

      expect(inventoryHistoryCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: null }),
      });
    });
  });
  
});