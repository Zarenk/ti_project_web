import { NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderTrackingService } from './ordertracking.service';

describe('OrderTrackingService multi-tenant behaviour', () => {
  let prisma: {
    orders: { findFirst: jest.Mock };
    orderTracking: { findMany: jest.Mock };
  };
  let service: OrderTrackingService;

  beforeEach(() => {
    prisma = {
      orders: {
        findFirst: jest.fn(),
      },
      orderTracking: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    service = new OrderTrackingService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('filters the order lookup by organization', async () => {
    prisma.orders.findFirst.mockResolvedValue({ id: 12, organizationId: 44 });
    const createdAt = new Date();
    prisma.orderTracking.findMany.mockResolvedValue([
      { id: 1, orderId: 12, status: 'CREATED', description: 'Created', createdAt },
    ]);

    const result = await service.findByOrderCode('ORD-12', 44);

    expect(prisma.orders.findFirst).toHaveBeenCalledWith({
      where: { code: 'ORD-12', organizationId: 44 },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 1, orderId: 12, status: 'CREATED' }),
    );
  });

  it('throws when the order is not found for the tenant', async () => {
    prisma.orders.findFirst.mockResolvedValue(null);

    await expect(service.findByOrderCode('ORD-404', 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.orderTracking.findMany).not.toHaveBeenCalled();
  });
});