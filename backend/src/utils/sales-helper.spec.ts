import { Prisma } from '@prisma/client';
import { executeSale } from './sales-helper';

describe('executeSale', () => {
  it('crea una transacción de caja por cada método de pago sin importar la cantidad de ítems', async () => {
    const paymentMethodMap = new Map<number, { id: number; name: string }>([
      [1, { id: 1, name: 'EN EFECTIVO' }],
      [2, { id: 2, name: 'YAPE' }],
    ]);

    const cashTransactionCreate = jest
      .fn()
      .mockImplementation(async ({ data }, idx: number) => ({
        id: 1000 + idx,
        ...data,
      }));
    const salePaymentCreate = jest.fn().mockResolvedValue(undefined);

    const prismaTxMock = {
      sales: {
        create: jest.fn().mockResolvedValue({ id: 9001 }),
      },
      client: {
        findUnique: jest.fn().mockResolvedValue({
          name: 'Cliente Demo',
          type: 'DNI',
          typeNumber: '12345678',
        }),
      },
      entryDetail: {
        findFirst: jest.fn().mockResolvedValue({ id: 501 }),
      },
      salesDetail: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      entryDetailSeries: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      storeOnInventory: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      inventoryHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      paymentMethod: {
        findUnique: jest
          .fn()
          .mockImplementation(async ({ where: { id } }: any) =>
            paymentMethodMap.get(id) ?? null,
          ),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      cashTransaction: { create: cashTransactionCreate },
      cashTransactionPaymentMethod: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      salePayment: { create: salePaymentCreate },
      invoiceSales: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const prismaMock = {
      $transaction: jest.fn(async (callback: any) => callback(prismaTxMock)),
      product: {
        findUnique: jest
          .fn()
          .mockImplementation(async ({ where: { id } }: any) => ({
            id,
            name: `Producto ${id}`,
          })),
      },
      cashRegister: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };

    const cashRegister = {
      id: 77,
      currentBalance: new Prisma.Decimal(150),
    };

    await executeSale(prismaMock as any, {
      userId: 5,
      storeId: 3,
      clientId: 9,
      description: 'Venta de prueba',
      allocations: [
        {
          detail: { productId: 100, quantity: 1, price: 25 },
          storeInventory: {
            id: 10,
            inventoryId: 60,
            stock: 5,
            storeId: 3,
          },
        },
        {
          detail: { productId: 200, quantity: 2, price: 15 },
          storeInventory: {
            id: 11,
            inventoryId: 61,
            stock: 8,
            storeId: 3,
          },
        },
      ],
      payments: [
        { paymentMethodId: 1, amount: 30, currency: 'PEN' },
        { paymentMethodId: 2, amount: 25, currency: 'PEN' },
      ],
      tipoMoneda: 'PEN',
      cashRegister,
      total: 55,
      source: 'POS',
      getStoreName: () => 'Tienda Demo',
      organizationId: 1,
      companyId: 2,
    });

    expect(cashTransactionCreate).toHaveBeenCalledTimes(2);
    expect(salePaymentCreate).toHaveBeenCalledTimes(2);
    expect(
      prismaTxMock.cashTransactionPaymentMethod.create,
    ).toHaveBeenCalledTimes(2);
  });
});

