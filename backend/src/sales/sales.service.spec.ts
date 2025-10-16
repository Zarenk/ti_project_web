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
  storeOnInventory: { findFirst: jest.Mock };
  salePayment: { findMany: jest.Mock };
  user: { findUnique: jest.Mock };
  sales: { findMany: jest.Mock };
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
      },
      salePayment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ username: 'seller@example.com' }),
      },
      sales: {
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
  
});