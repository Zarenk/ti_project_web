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
import { InventoryService } from 'src/inventory/inventory.service';
import {
  CompleteOrderDto,
  isDeliveryShipping,
  normalizeCarrierMode,
  normalizeShippingMethod,
} from './dto/complete-order.dto';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import {
  ClientUncheckedCreateInputWithOrganization,
  UserUncheckedCreateInputWithOrganization,
} from 'src/tenancy/prisma-organization.types';

@Injectable()
export class WebSalesService {
  private readonly logger = new Logger(WebSalesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly accountingHook: AccountingHook,
    private readonly inventoryService: InventoryService,
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

    const metadata: Record<string, unknown> = { userId: data.userId };
    if (typeof data.storeId === 'number') {
      metadata.storeId = data.storeId;
    }
    if (code) {
      metadata.code = code;
    }

    logOrganizationContext({
      service: WebSalesService.name,
      operation: 'createWebOrder',
      organizationId: data.organizationId,
      metadata,
    });

    // Ensure actor is recorded even when req is not provided
    const webEmail =
      (data as any)?.email ??
      (data as any)?.customerEmail ??
      (data as any)?.customer?.email ??
      undefined;
    const isWebSource = (data as any)?.source === 'WEB' || !!webEmail;
    const createdActorId = isWebSource
      ? undefined
      : ((req as any)?.user?.userId ?? undefined);
    const createdActorEmail = isWebSource
      ? webEmail
      : ((req as any)?.user?.username ?? undefined);
    const createdByLabel =
      createdActorEmail ??
      (createdActorId ? `ID ${createdActorId}` : undefined);
    await this.activityService.log(
      {
        actorId: createdActorId,
        actorEmail: createdActorEmail,
        entityType: 'Order',
        entityId: order.id.toString(),
        action: AuditAction.CREATED,
        summary: createdByLabel
          ? `Orden ${order.code} creada por ${createdByLabel}`
          : `Orden ${order.code} creada`,
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
      personalDni,
      ruc,
      firstName,
      lastName,
      invoiceName,
      razonSocial,
      organizationId: inputOrganizationId,
    } = data;

    logOrganizationContext({
      service: WebSalesService.name,
      operation: 'createWebSale',
      organizationId: inputOrganizationId,
      metadata: { storeId, userId },
    });

    let resolvedClientId = clientId;

    if (!resolvedClientId) {
      const documentNumber = personalDni || ruc;
      const documentType = personalDni ? 'DNI' : ruc ? 'RUC' : undefined;
      const orderName =
        invoiceName ||
        razonSocial ||
        `${firstName ?? ''} ${lastName ?? ''}`.trim();

      if (documentNumber && documentType && orderName) {
        const existingClient = await this.prisma.client.findUnique({
          where: { typeNumber: documentNumber },
          select: { id: true },
        });

        if (existingClient) {
          resolvedClientId = existingClient.id;
        } else {
          const unique = Date.now();
          logOrganizationContext({
            service: WebSalesService.name,
            operation: 'createWebSale.createUser',
            organizationId: inputOrganizationId,
            metadata: { documentNumber },
          });
          const userCreateData: UserUncheckedCreateInputWithOrganization = {
            email: `web_${unique}@client.local`,
            username: `web_${unique}`,
            password: 'default_password',
            role: 'CLIENT',
            organizationId: inputOrganizationId ?? null,
          };

          const user = await this.prisma.user.create({
            data: userCreateData,
            select: { id: true },
          });

          logOrganizationContext({
            service: WebSalesService.name,
            operation: 'createWebSale.createClient',
            organizationId: inputOrganizationId,
            metadata: { documentNumber },
          });
          const clientCreateData: ClientUncheckedCreateInputWithOrganization = {
            name: orderName,
            type: documentType,
            typeNumber: documentNumber,
            userId: user.id,
            status: 'Activo',
            organizationId: inputOrganizationId ?? null,
          };

          const newClient = await this.prisma.client.create({
            data: clientCreateData,
            select: { id: true },
          });

          resolvedClientId = newClient.id;
        }
      }
    }

    const { store, cashRegister, clientIdToUse } = await prepareSaleContext(
      this.prisma,
      storeId,
      resolvedClientId,
    );

    const organizationId =
      inputOrganizationId ?? (store as any).organizationId ?? null;

    logOrganizationContext({
      service: WebSalesService.name,
      operation: 'createWebSale.executeSale',
      organizationId,
      metadata: {
        storeId,
        userId,
        clientId: clientIdToUse ?? resolvedClientId ?? null,
      },
    });

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
        throw new BadRequestException(
          `Stock insuficiente para el producto con ID ${detail.productId}.`,
        );
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
      organizationId,

      onSalePosted: async (id) => {
        try {
          await this.accountingHook.postSale(id);
        } catch (err) {
          this.logger.warn(`Retrying accounting post for sale ${id}`);
        }
      },
    });

    const salePayments = await this.prisma.salePayment.findMany({
      where: { salesId: createdSale.id },
      select: { id: true },
    });

    for (const payment of salePayments) {
      try {
        await this.accountingHook.postPayment(payment.id);
      } catch (err) {
        this.logger.warn(`Retrying accounting post for payment ${payment.id}`);
      }
    }    

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
        `No se encontrÃ³ la venta reciÃ©n creada con ID ${createdSale.id}.`,
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
      throw new NotFoundException(`No se encontrÃ³ la orden con ID ${id}.`);
    }
    return order;
  }

  async getWebOrderByCode(code: string) {
    const order = await this.prisma.orders.findUnique({ where: { code } });
    if (!order) {
      throw new NotFoundException(
        `No se encontrÃ³ la orden con cÃ³digo ${code}.`,
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

  async getWebOrdersByEmail(email: string) {
    return this.prisma.orders.findMany({
      where: {
        payload: {
          path: ['email'],
          equals: email,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWebOrdersByDni(dni: string) {
    return this.prisma.orders.findMany({
      where: {
        OR: [
          {
            payload: {
              path: ['personalDni'],
              equals: dni,
            } as any,
          },
          {
            payload: {
              path: ['dni'],
              equals: dni,
            } as any,
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async completeWebOrder(id: number, dto?: CompleteOrderDto, req?: Request) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order || order.status !== 'PENDING' || !order.payload) {
      throw new BadRequestException('Orden no vÃ¡lida para completar');
    }

    const payloadAny = (order.payload as any) || {};
    const rawOrganizationId = payloadAny?.organizationId as unknown;
    let organizationIdForLog: number | null = null;
    if (typeof rawOrganizationId === 'number') {
      organizationIdForLog = rawOrganizationId;
    } else if (typeof rawOrganizationId === 'string') {
      const parsed = Number(rawOrganizationId);
      organizationIdForLog = Number.isNaN(parsed) ? null : parsed;
    }

    logOrganizationContext({
      service: WebSalesService.name,
      operation: 'completeWebOrder',
      organizationId: organizationIdForLog,
      metadata: {
        orderId: id,
        storeId: payloadAny?.storeId ?? null,
      },
    });
    const details: any[] = Array.isArray(payloadAny.details)
      ? payloadAny.details
      : [];
    const storeId = payloadAny?.storeId
      ? Number(payloadAny.storeId)
      : undefined;

    const rawShippingMethod = dto?.shippingMethod ?? payloadAny?.shippingMethod;
    const normalizedShippingMethod = rawShippingMethod
      ? normalizeShippingMethod(String(rawShippingMethod))
      : undefined;
    const requiresCarrier = isDeliveryShipping(
      normalizedShippingMethod ?? rawShippingMethod,
    );

    const requestedCarrierName = dto?.carrierName?.trim();
    const requestedCarrierId = dto?.carrierId?.trim();
    const requestedCarrierMode = normalizeCarrierMode(dto?.carrierMode);

    const existingCarrierName = order.carrierName?.trim() || undefined;
    const existingCarrierId = order.carrierId?.trim() || undefined;
    const existingCarrierMode = normalizeCarrierMode(order.carrierMode);

    const carrierNameToPersist = requestedCarrierName || existingCarrierName;
    const carrierIdToPersist = requestedCarrierId || existingCarrierId;
    const carrierModeToPersist = requestedCarrierMode || existingCarrierMode;

    if (requiresCarrier && (!carrierNameToPersist || !carrierModeToPersist)) {
      throw new BadRequestException(
        'Los pedidos con envío a domicilio requieren el transportista y su modalidad.',
      );
    }

    const updateData: Prisma.OrdersUpdateInput = {};
    if (
      requestedCarrierName !== undefined ||
      carrierNameToPersist !== existingCarrierName
    ) {
      if (carrierNameToPersist) {
        updateData.carrierName = carrierNameToPersist;
      } else if (requestedCarrierName !== undefined) {
        updateData.carrierName = null;
      }
    }

    if (
      requestedCarrierId !== undefined ||
      carrierIdToPersist !== existingCarrierId
    ) {
      if (carrierIdToPersist) {
        updateData.carrierId = carrierIdToPersist;
      } else if (requestedCarrierId !== undefined) {
        updateData.carrierId = null;
      }
    }

    if (
      requestedCarrierMode !== undefined ||
      carrierModeToPersist !== existingCarrierMode
    ) {
      if (carrierModeToPersist) {
        updateData.carrierMode = carrierModeToPersist;
      } else if (requestedCarrierMode !== undefined) {
        updateData.carrierMode = null;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.orders.update({ where: { id }, data: updateData });
    }

    for (const d of details) {
      const productId = Number(d.productId);
      const quantity = Number(d.quantity);
      const selectedSeries = Array.isArray(d.series) ? d.series : [];

      let available: string[] = [];
      if (storeId && !Number.isNaN(storeId)) {
        available = await this.inventoryService.getSeriesByProductAndStore(
          storeId,
          productId,
        );
      } else {
        const storeLinks = await this.prisma.storeOnInventory.findMany({
          where: { inventory: { productId } },
          select: { storeId: true },
        });
        const agg: string[] = [];
        for (const link of storeLinks) {
          const sers = await this.inventoryService.getSeriesByProductAndStore(
            link.storeId,
            productId,
          );
          agg.push(...sers);
        }
        available = Array.from(new Set(agg));
      }

      if (available.length > 0 && selectedSeries.length !== quantity) {
        throw new BadRequestException(
          `El producto ${productId} requiere ${quantity} series`,
        );
      }
    }

    const sale = await this.createWebSale(order.payload as any, true);

    await this.prisma.orders.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        salesId: sale.id,
        ...(carrierNameToPersist ? { carrierName: carrierNameToPersist } : {}),
        ...(carrierIdToPersist ? { carrierId: carrierIdToPersist } : {}),
        ...(carrierModeToPersist ? { carrierMode: carrierModeToPersist } : {}),
      },
    });

    // Fallback to sale.userId when req is not present so we always capture the actor
    // Prefer attributing the update to the web customer when no staff context is present
    const customerEmail =
      payloadAny?.email ??
      payloadAny?.customerEmail ??
      payloadAny?.customer?.email ??
      payloadAny?.user?.email;
    const completedActorId = (req as any)?.user?.userId ?? undefined;
    const completedActorEmail =
      (req as any)?.user?.username ?? customerEmail ?? undefined; // ActivityService will resolve from actorId only if email is absent
    const completedByLabel =
      completedActorEmail ??
      (completedActorId ? `ID ${completedActorId}` : undefined);
    await this.activityService.log(
      {
        actorId: completedActorId,
        actorEmail: completedActorEmail,
        entityType: 'Order',
        entityId: id.toString(),
        action: AuditAction.UPDATED,
        summary: completedByLabel
          ? `Orden ${order.code} completada por ${completedByLabel}`
          : `Orden ${order.code} completada`,
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

  async updateOrderSeries(
    id: number,
    items: { productId: number; series: string[] }[],
  ) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`No se encontró la orden con ID ${id}.`);
    }
    const payload: any = order.payload || {};
    const details: any[] = Array.isArray(payload.details)
      ? payload.details
      : [];

    if (details.length === 0) {
      throw new BadRequestException(
        'La orden no contiene detalles para actualizar series',
      );
    }

    const map = new Map<number, string[]>();
    for (const it of items) {
      if (!it || typeof it.productId !== 'number' || !Array.isArray(it.series)) continue;
      // Unicos y sin falsy
      const uniq = Array.from(new Set(it.series.filter(Boolean)));
      map.set(it.productId, uniq);
    }

    const updatedDetails = details.map((d) => {
      if (map.has(Number(d.productId))) {
        const series = map.get(Number(d.productId))!;
        // Validación opcional: si hay series provistas, deben ser exactamente igual a la cantidad
        if (typeof d.quantity === 'number' && series.length !== Number(d.quantity)) {
          throw new BadRequestException(
            `El producto ${d.productId} requiere ${d.quantity} series, se recibieron ${series.length}`,
          );
        }
        return { ...d, series };
      }
      return d;
    });

    const updated = await this.prisma.orders.update({
      where: { id },
      data: { payload: { ...payload, details: updatedDetails } },
    });

    return { success: true, order: updated };
  }

  async rejectWebOrder(id: number) {
    const order = await this.prisma.orders.findUnique({ where: { id } });
    if (!order || order.status !== 'PENDING') {
      throw new BadRequestException('Orden no vÃ¡lida para rechazar');
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
      throw new NotFoundException(`No se encontrÃ³ la orden con ID ${id}.`);
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
      throw new NotFoundException(`No se encontrÃ³ la venta con ID ${id}.`);
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
