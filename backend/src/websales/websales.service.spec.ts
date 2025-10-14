import { WebSalesService } from './websales.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { InventoryService } from 'src/inventory/inventory.service';
import { executeSale, prepareSaleContext } from 'src/utils/sales-helper';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

type PrismaMock = {
  client: { findUnique: jest.Mock; create: jest.Mock };
  user: { create: jest.Mock; findUnique: jest.Mock };
  storeOnInventory: { findFirst: jest.Mock };
  salePayment: { findMany: jest.Mock };
  sales: { findUnique: jest.Mock };
  orders: { create: jest.Mock };
};

jest.mock('src/utils/sales-helper', () => ({
  executeSale: jest.fn(),
  prepareSaleContext: jest.fn(),
}));

jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

describe('WebSalesService multi-organization support', () => {
  let prisma: PrismaMock;
  let prismaService: PrismaService;
  let service: WebSalesService;
  let activityService: { log: jest.Mock };
  let accountingHook: { postSale: jest.Mock; postPayment: jest.Mock };
  let inventoryService: InventoryService;

  const baseSaleInput = {
    userId: 10,
    storeId: 20,
    description: 'Test web sale',
    details: [
      { productId: 1, quantity: 2, price: 50 },
    ],
    payments: [
      { paymentMethodId: 1, amount: 100, currency: 'PEN' },
    ],
    tipoComprobante: 'BOL',
    tipoMoneda: 'PEN',
    total: 100,
  };

  beforeEach(() => {
    prisma = {
      client: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 400 }),
      },
      user: {
        create: jest.fn().mockResolvedValue({ id: 300 }),
        findUnique: jest.fn().mockResolvedValue({ username: 'seller@example.com' }),
      },
      storeOnInventory: {
        findFirst: jest.fn().mockResolvedValue({
          id: 50,
          stock: 20,
          store: { id: baseSaleInput.storeId, name: 'Main store', organizationId: null },
        }),
      },
      salePayment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      sales: {
        findUnique: jest.fn().mockResolvedValue({
          id: 999,
          userId: baseSaleInput.userId,
          total: 100,
          client: null,
          store: { id: baseSaleInput.storeId, name: 'Main store' },
          salesDetails: [],
          invoices: [],
          order: null,
        }),
      },
      orders: {
        create: jest.fn(),
      },
    };

    activityService = { log: jest.fn().mockResolvedValue(undefined) };
    accountingHook = {
      postSale: jest.fn().mockResolvedValue(undefined),
      postPayment: jest.fn().mockResolvedValue(undefined),
    };
    inventoryService = {} as InventoryService;

    (prepareSaleContext as jest.Mock).mockReset();
    (executeSale as jest.Mock).mockReset();
    (logOrganizationContext as jest.Mock).mockReset();

    prismaService = prisma as unknown as PrismaService;

    service = new WebSalesService(
      prismaService,
      activityService as unknown as ActivityService,
      accountingHook as unknown as AccountingHook,
      inventoryService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('propagates the provided organizationId through logging, user and client creation and sale execution', async () => {
    (prepareSaleContext as jest.Mock).mockResolvedValue({
      store: { id: baseSaleInput.storeId, name: 'Main store', organizationId: 987 },
      cashRegister: { id: 77 },
      clientIdToUse: undefined,
    });
    (executeSale as jest.Mock).mockResolvedValue({ id: 999, total: 100 });

    await service.createWebSale({
      ...baseSaleInput,
      personalDni: '12345678',
      firstName: 'Jane',
      lastName: 'Doe',
      organizationId: 321,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 321 }),
      }),
    );

    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 321 }),
      }),
    );

    expect(executeSale).toHaveBeenCalledWith(
      prismaService,
      expect.objectContaining({ organizationId: 321 }),
    );

    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 321 }),
    );
  });

  it('falls back to the store organizationId when none is provided in the payload', async () => {
    (prepareSaleContext as jest.Mock).mockResolvedValue({
      store: { id: baseSaleInput.storeId, name: 'Main store', organizationId: 654 },
      cashRegister: { id: 88 },
      clientIdToUse: 222,
    });
    (executeSale as jest.Mock).mockResolvedValue({ id: 321, total: 100 });

    await service.createWebSale({
      ...baseSaleInput,
      clientId: 222,
    });

    expect(executeSale).toHaveBeenCalledWith(
      prismaService,
      expect.objectContaining({ organizationId: 654 }),
    );

    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 654 }),
    );
  });

  it('defaults organizationId to null when both payload and store lack a tenant', async () => {
    (prepareSaleContext as jest.Mock).mockResolvedValue({
      store: { id: baseSaleInput.storeId, name: 'Main store', organizationId: null },
      cashRegister: { id: 55 },
      clientIdToUse: 333,
    });
    (executeSale as jest.Mock).mockResolvedValue({ id: 654, total: 100 });

    await service.createWebSale({
      ...baseSaleInput,
      clientId: 333,
    });

    expect(executeSale).toHaveBeenCalledWith(
      prismaService,
      expect.objectContaining({ organizationId: null }),
    );

    expect(logOrganizationContext).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: null }),
    );
  });
});