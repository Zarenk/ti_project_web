import { Test, TestingModule } from '@nestjs/testing';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

describe('SalesController', () => {
  let controller: SalesController;
  let service: jest.Mocked<SalesService>;

  const createSaleBasePayload: CreateSaleDto = {
    userId: 1,
    storeId: 2,
    total: 100,
    tipoMoneda: 'PEN',
    details: [
      {
        productId: 1,
        quantity: 1,
        price: 100,
      },
    ],
    payments: [
      {
        paymentMethodId: 1,
        amount: 100,
        currency: 'PEN',
      },
    ],
  } as CreateSaleDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesController],
      providers: [
        {
          provide: SalesService,
          useValue: {
            createSale: jest.fn(),
            findAllSales: jest.fn(),
            getSoldSeriesBySale: jest.fn(),
            getTopProducts: jest.fn(),
            deleteSale: jest.fn(),
            getTopClients: jest.fn(),
            getProductSalesReport: jest.fn(),
            getSalesTransactions: jest.fn(),
            findOne: jest.fn(),
            getRecentSales: jest.fn(),
            findSalesByUser: jest.fn(),
            getMonthlySalesTotal: jest.fn(),
            getMonthlySalesCount: jest.fn(),
            getMonthlyClientStats: jest.fn(),
            getRevenueByCategory: jest.fn(),
            getDailySalesByDateRange: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SalesController>(SalesController);
    service = module.get(SalesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('propagates explicit organization and company when creating a sale', async () => {
    const createSaleDto: CreateSaleDto = {
      ...createSaleBasePayload,
      organizationId: 55,
      companyId: 66,
    };

    service.createSale.mockResolvedValue({ id: 1 } as any);

    await controller.createSale(createSaleDto, 77, 91);

    expect(service.createSale).toHaveBeenCalledWith({
      ...createSaleDto,
      organizationId: 55,
      companyId: 66,
    });
  });

  it('uses tenant context when payload omits organization and company', async () => {
    service.createSale.mockResolvedValue({ id: 2 } as any);

    await controller.createSale({ ...createSaleBasePayload }, 88, 22);

    expect(service.createSale).toHaveBeenCalledWith({
      ...createSaleBasePayload,
      organizationId: 88,
      companyId: 22,
    });
  });

  it('omits organizationId and companyId when both payload and context are null', async () => {
    service.createSale.mockResolvedValue({ id: 3 } as any);

    await controller.createSale({ ...createSaleBasePayload }, null, null);

    expect(service.createSale).toHaveBeenCalledWith({
      ...createSaleBasePayload,
      organizationId: undefined,
      companyId: undefined,
    });
  });

  it('forwards organization and company to findAllSales', async () => {
    await controller.findAllSales(45, 11);

    expect(service.findAllSales).toHaveBeenCalledWith(45, 11);
  });

  it('converts null tenant identifiers to undefined for findAllSales', async () => {
    await controller.findAllSales(null, null);

    expect(service.findAllSales).toHaveBeenCalledWith(undefined, undefined);
  });

  it('passes organization context to getTopProductsByRange', async () => {
    await controller.getTopProductsByRange('2024-01-01', '2024-01-31', 12, 44);

    expect(service.getTopProducts).toHaveBeenCalledWith(
      10,
      '2024-01-01',
      '2024-01-31',
      12,
      44,
    );
  });

  it('falls back to undefined for missing tenant identifiers in getTopProducts', async () => {
    await controller.getTopProductsByRange('2024-01-01', '2024-01-31', null, null);

    expect(service.getTopProducts).toHaveBeenCalledWith(
      10,
      '2024-01-01',
      '2024-01-31',
      undefined,
      undefined,
    );
  });

  it('propagates organization and company in deleteSale', async () => {
    const requestMock: any = { user: { userId: 99 } };

    await controller.deleteSale(10, requestMock, 33, 7);

    expect(service.deleteSale).toHaveBeenCalledWith(10, 99, 33, 7);
  });

  it('propagates undefined tenant ids in deleteSale for legacy context', async () => {
    const requestMock: any = { user: { userId: 99 } };

    await controller.deleteSale(10, requestMock, null, null);

    expect(service.deleteSale).toHaveBeenCalledWith(
      10,
      99,
      undefined,
      undefined,
    );
  });

  it('maps tenant context when finding a sale by id', async () => {
    await controller.findOne(5, 71, 19);

    expect(service.findOne).toHaveBeenCalledWith(5, 71, 19);
  });

  it('maps tenant context to sales transactions', async () => {
    await controller.getSalesTransactions(
      '2024-01-01',
      '2024-01-31',
      null,
      null,
    );

    expect(service.getSalesTransactions).toHaveBeenCalledWith(
      new Date('2024-01-01'),
      new Date('2024-01-31'),
      undefined,
      undefined,
    );
  });
});
