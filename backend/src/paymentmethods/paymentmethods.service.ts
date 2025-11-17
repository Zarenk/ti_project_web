import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  // Obtener todos los métodos de pago activos
  async getAllActivePaymentMethods() {
    return await this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // Crear un nuevo método de pago
  async createPaymentMethod(data: { name: string; description?: string }) {
    return this.prisma.paymentMethod.create({ data });
  }

  // Actualizar un método de pago
  async updatePaymentMethod(
    id: number,
    data: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.prisma.paymentMethod.update({
      where: { id },
      data,
    });
  }
}
