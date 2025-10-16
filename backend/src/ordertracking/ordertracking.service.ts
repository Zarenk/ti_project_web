import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';

@Injectable()
export class OrderTrackingService {
  constructor(private prisma: PrismaService) {}

  async findByOrderCode(code: string, organizationId?: number | null) {
    const organizationFilter = buildOrganizationFilter(
      organizationId,
    ) as Prisma.OrdersWhereInput;
    const order = await this.prisma.orders.findFirst({
      where: { code, ...organizationFilter },
    });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    return this.prisma.orderTracking.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });
  }
}