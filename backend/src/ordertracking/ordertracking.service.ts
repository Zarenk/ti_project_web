import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderTrackingService {
  constructor(private prisma: PrismaService) {}

  async findByOrderCode(code: string) {
    const order = await this.prisma.orders.findUnique({ where: { code } });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    return this.prisma.orderTracking.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });
  }
}