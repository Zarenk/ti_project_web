import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateWebSaleDto } from './dto/create-websale.dto';
import {
  prepareSaleContext,
  executeSale,
  SaleAllocation,
} from '../utils/sales-helper';

@Injectable()
export class WebSalesService {
  constructor(private prisma: PrismaService) {}

  async createWebOrder(data: CreateWebSaleDto) {
    const { shippingName, shippingAddress, city, postalCode, phone, code } = data;
    const order = await this.prisma.orders.create({
      data: {
        status: 'PENDING',
        shippingName: shippingName ?? '',
        shippingAddress: shippingAddress ?? '',
        city: city ?? '',
        postalCode: postalCode ?? '',
        phone,
        code: code ?? Math.random().toString(36).substr(2, 9).toUpperCase(),
        payload: data as unknown as Prisma.JsonObject,
      },
    });
    return order;
  }

  async createWebSale(data: CreateWebSaleDto, skipOrder = false) {
    const {
      userId,
      storeId = 1,
      clientId,
      description,
      details,
      payments,
      tipoComprobante,
      tipoMoneda,
      shippingName,
      shippingAddress,
      city,
      postalCode,
      phone,
      code,
    } = data;

    const { store, cashRegister, clientIdToUse } = await prepareSaleContext(this.prisma, storeId, clientId);

    const allocations: SaleAllocation[] = [];
    
    let total = 0;
    for (const detail of details) {
      const storeInventory = await this.prisma.storeOnInventory.findFirst({
        where: {
          inventory: { productId: detail.productId },
          stock: { gte: detail.quantity },
        },
        include: { store: true },
      });

      if (!storeInventory) {
        throw new BadRequestException(`Stock insuficiente para el producto con ID ${detail.productId}.`);
      }

      allocations.push({ detail, storeInventory });
      total += detail.quantity * detail.price;
    }

    const sale = await executeSale(this.prisma, {
      userId,
      storeId,
      clientId: clientIdToUse,
      description,
      allocations,
      payments,
      tipoComprobante,
      tipoMoneda,
      cashRegister,
      total,
      source: 'WEB',
      getStoreName: ({ storeInventory }) => storeInventory.store.name,
      
    });

    if (!skipOrder && shippingName && shippingAddress && city && postalCode) {
      await this.prisma.orders.create({
        data: {
          salesId: sale.id,
          shippingName,
          shippingAddress,
          city,
          postalCode,
          phone,
          code: code ?? Math.random().toString(36).substr(2, 9).toUpperCase(),
          status: 'COMPLETED',
        },
      });
    }

    return sale;
  }

  async getWebOrderById(id: number) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`No se encontró la orden con ID ${id}.`);
    }
    return order;
  }

  async getWebOrdersByUser(userId: number) {
    return this.prisma.orders.findMany({
      where: {
        payload: {
          path: ['userId'],
          equals: userId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async completeWebOrder(id: number) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order || order.status !== 'PENDING' || !order.payload) {
      throw new BadRequestException('Orden no válida para completar');
    }

    const sale = await this.createWebSale(order.payload as any, true);

    await this.prisma.orders.update({
      where: { id },
      data: { status: 'COMPLETED', salesId: sale.id },
    });

    return sale;
  }

  async addOrderProofs(
    id: number,
    images: string[],
    description?: string,
  ) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`No se encontró la orden con ID ${id}.`);
    }

    const payload = (order.payload as any) || {};
    const existing = Array.isArray(payload.proofImages)
      ? payload.proofImages
      : [];
    payload.proofImages = [...existing, ...images];
    if (description) payload.proofDescription = description;

    await this.prisma.orders.update({
      where: { id },
      data: { payload },
    });

    return { success: true };
  }

  async getWebSaleById(id: number) {
    const sale = await this.prisma.sales.findUnique({
      where: { id },
      include: {
        client: true,
        salesDetails: {
          include: {
            entryDetail: { include: { product: true } },
          },
        },
        invoices: true,
        order: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`No se encontró la venta con ID ${id}.`);
    }

    return sale;
  }

  async getOrders(params: {
    status?: string;
    from?: string;
    to?: string;
    clientId?: string;
    code?: string;
  }) {
    const where: Prisma.OrdersWhereInput = {};

    if (params.status) {
      where.status = params.status as any;
    }
    if (params.from && params.to) {
      where.createdAt = {
        gte: new Date(params.from),
        lte: new Date(params.to),
      };
    }
    if (params.clientId) {
      const idNum = parseInt(params.clientId, 10);
      if (!isNaN(idNum)) {
        where.payload = { path: ['userId'], equals: idNum } as any;
      }
    }
    if (params.code) {
      where.code = { contains: params.code };
    }

    return this.prisma.orders.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderCount(status?: string) {
    return this.prisma.orders.count({
      where: status ? { status: status as any } : undefined,
    });
  }
}