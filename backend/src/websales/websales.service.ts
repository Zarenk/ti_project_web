import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, AuditAction } from '@prisma/client';
import { CreateWebSaleDto } from './dto/create-websale.dto';
import {
  prepareSaleContext,
  executeSale,
  SaleAllocation,
} from '../utils/sales-helper';
import { ActivityService } from '../activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { Request } from 'express';

@Injectable()
export class WebSalesService {
  private readonly logger = new Logger(WebSalesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly accountingHook: AccountingHook,
  ) {}

  async payWithCulqi(token: string, amount: number, order: CreateWebSaleDto) {
    const secret = process.env.CULQI_SECRET_KEY;
    if (!secret) {
      throw new BadRequestException('CULQI_SECRET_KEY not configured');
    }

    const chargeRes = await fetch('https://api.culqi.com/v2/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency_code: 'PEN',
        email: order.email ?? 'cliente@example.com',
        source_id: token,
      }),
    });

    const charge = await chargeRes.json();

    if (!chargeRes.ok) {
      throw new BadRequestException(
        charge?.merchant_message || 'Culqi charge failed',
      );
    }

    if (order.payments && order.payments.length > 0) {
      order.payments[0].transactionId = charge.id;
    }

    const createdOrder = await this.createWebOrder(order);
    const sale = await this.completeWebOrder(createdOrder.id);
    return sale;
  }

  async createWebOrder(data: CreateWebSaleDto, req?: Request) {
    const { shippingName, shippingAddress, city, postalCode, phone, code } =
      data;
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

    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Order',
        entityId: order.id.toString(),
        action: AuditAction.CREATED,
        summary: `Orden ${order.code} creada`,
        diff: { after: order } as any,
      },
      req,
    );

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

    const createdSale = await executeSale(this.prisma, {
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

      onSalePosted: async (id) => {
        try {
          await this.accountingHook.postSale(id);
        } catch (err) {
          this.logger.warn(`Retrying accounting post for sale ${id}`);
        }
      },     
    });

    if (!skipOrder && shippingName && shippingAddress && city && postalCode) {
      await this.prisma.orders.create({
        data: {
          salesId: createdSale.id,
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

    const sale = await this.prisma.sales.findUnique({
      where: { id: createdSale.id },
      include: {
        client: true,
        store: true,
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
      throw new NotFoundException(
        `No se encontró la venta recién creada con ID ${createdSale.id}.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sale.userId },
      select: { username: true },
    });

    await this.activityService.log({
      actorId: sale.userId,
      actorEmail: user?.username,
      entityType: 'Sale',
      entityId: sale.id.toString(),
      action: AuditAction.CREATED,
      summary: `Venta ${sale.id} por ${sale.total} realizada por ${user?.username ?? 'ID ' + sale.userId}`,
      diff: { after: sale } as any,
    });

    return sale;
  }

  async getWebOrderById(id: number) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`No se encontró la orden con ID ${id}.`);
    }
    return order;
  }

   async getWebOrderByCode(code: string) {
    const order = await this.prisma.orders.findUnique({ where: { code } });
    if (!order) {
      throw new NotFoundException(
        `No se encontró la orden con código ${code}.`,
      );
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

  async completeWebOrder(id: number, req?: Request) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order || order.status !== 'PENDING' || !order.payload) {
      throw new BadRequestException('Orden no válida para completar');
    }

    const sale = await this.createWebSale(order.payload as any, true);

    await this.prisma.orders.update({
      where: { id },
      data: { status: 'COMPLETED', salesId: sale.id },
    });

    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Order',
        entityId: id.toString(),
        action: AuditAction.UPDATED,
        summary: `Orden ${order.code} completada`,
        diff: {
          before: { status: 'PENDING' },
          after: { status: 'COMPLETED' },
        } as any,
      },
      req,
    );

    const enrichedSale = await this.prisma.sales.findUnique({
      where: { id: sale.id },
      include: {
        client: true,
        store: true,
        salesDetails: {
          include: {
            entryDetail: { include: { product: true } },
          },
        },
        invoices: true,
        order: true,
      },
    });

    if (enrichedSale) {
      const user = await this.prisma.user.findUnique({
        where: { id: enrichedSale.userId },
        select: { username: true },
      });

      await this.activityService.log({
        actorId: enrichedSale.userId,
        actorEmail: user?.username,
        entityType: 'Sale',
        entityId: enrichedSale.id.toString(),
        action: AuditAction.UPDATED,
        summary: `Venta ${enrichedSale.id} por ${enrichedSale.total} completada por ${user?.username ?? 'ID ' + enrichedSale.userId}`,
        diff: { after: enrichedSale } as any,
      });
    }

    return enrichedSale;
  }

  async rejectWebOrder(id: number) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order || order.status !== 'PENDING') {
      throw new BadRequestException('Orden no válida para rechazar');
    }
    await this.prisma.orders.update({
      where: { id },
      data: { status: 'DENIED' },
    });
    return { success: true };
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

  async getRecentOrders(params: {
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const where: Prisma.OrdersWhereInput = {};

    if (params.from && params.to) {
      where.createdAt = {
        gte: new Date(params.from),
        lte: new Date(params.to),
      };
    }

    const take = params.limit ?? 10;

    return this.prisma.orders.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}