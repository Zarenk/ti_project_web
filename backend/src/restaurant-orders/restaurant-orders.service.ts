import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, RestaurantOrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerticalConfigService } from 'src/tenancy/vertical-config.service';
import { IngredientsService } from 'src/ingredients/ingredients.service';
import { KitchenGateway } from './kitchen.gateway';
import { buildOrganizationFilter, resolveCompanyId } from 'src/tenancy/organization.utils';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { UpdateRestaurantOrderDto } from './dto/update-restaurant-order.dto';
import { UpdateRestaurantOrderItemDto } from './dto/update-restaurant-order-item.dto';
import { CheckoutRestaurantOrderDto } from './dto/checkout-restaurant-order.dto';

@Injectable()
export class RestaurantOrdersService {
  private readonly logger = new Logger(RestaurantOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verticalConfig: VerticalConfigService,
    private readonly ingredientsService: IngredientsService,
    private readonly kitchenGateway: KitchenGateway,
  ) {}

  private async ensureReservationsFeatureEnabled(
    companyId?: number | null,
  ): Promise<void> {
    if (companyId == null) {
      return;
    }

    const config = await this.verticalConfig.getConfig(companyId);
    if (config.features.reservations === false) {
      throw new ForbiddenException(
        'El modulo de ordenes/reservas no esta habilitado para esta empresa.',
      );
    }
  }

  private resolveContext(dto: { organizationId?: number | null; companyId?: number | null }, organizationIdFromContext?: number | null, companyIdFromContext?: number | null) {
    const resolvedOrganizationId =
      organizationIdFromContext === undefined
        ? (dto.organizationId ?? null)
        : organizationIdFromContext;
    const resolvedCompanyId =
      companyIdFromContext === undefined
        ? resolveCompanyId({
            provided: dto.companyId ?? null,
            mismatchError: 'La compania proporcionada no coincide con el contexto.',
          })
        : resolveCompanyId({
            provided: dto.companyId ?? null,
            fallbacks: [companyIdFromContext],
            mismatchError: 'La compania proporcionada no coincide con el contexto.',
          });

    if (!resolvedOrganizationId && !resolvedCompanyId) {
      throw new BadRequestException('Contexto de tenant no disponible para crear la orden.');
    }

    return { resolvedOrganizationId, resolvedCompanyId };
  }

  async create(
    dto: CreateRestaurantOrderDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
    createdById?: number | null,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException('Debes agregar al menos un item a la orden.');
    }

    const { resolvedOrganizationId, resolvedCompanyId } = this.resolveContext(
      dto,
      organizationIdFromContext,
      companyIdFromContext,
    );

    // Validate reservations feature is enabled
    await this.ensureReservationsFeatureEnabled(resolvedCompanyId);

    const subtotal = dto.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );
    const normalizedOrderType =
      dto.orderType === 'TAKEOUT'
        ? 'TAKEAWAY'
        : (dto.orderType ?? 'DINE_IN');

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.restaurantOrder.create({
        data: {
          organizationId: resolvedOrganizationId ?? null,
          companyId: resolvedCompanyId ?? null,
          storeId: dto.storeId ?? null,
          tableId: dto.tableId ?? null,
          clientId: dto.clientId ?? null,
          createdById: createdById ?? null,
          orderType: normalizedOrderType,
          notes: dto.notes ?? null,
          status: 'OPEN',
          subtotal,
          total: subtotal,
        },
      });

      await tx.restaurantOrderItem.createMany({
        data: dto.items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          stationId: item.stationId ?? null,
          notes: item.notes ?? null,
          status: 'PENDING',
        })),
      });

      // Auto-update table status to OCCUPIED when a DINE_IN order is created
      if (dto.tableId && normalizedOrderType === 'DINE_IN') {
        await tx.restaurantTable.update({
          where: { id: dto.tableId },
          data: { status: 'OCCUPIED', currentOrderId: order.id },
        });
      }

      const result = await tx.restaurantOrder.findUnique({
        where: { id: order.id },
        include: {
          table: true,
          items: { include: { product: true, station: true } },
        },
      });

      return result;
    });

    // Emit WebSocket event after transaction commits
    if (created) {
      this.kitchenGateway.emitOrderUpdate(
        created.organizationId ?? null,
        created.companyId ?? null,
        { orderId: created.id, status: created.status, action: 'created' },
      );
      if (dto.tableId) {
        this.kitchenGateway.emitTableUpdate(
          created.organizationId ?? null,
          created.companyId ?? null,
          { tableId: dto.tableId, status: 'OCCUPIED' },
        );
      }
    }

    return created;
  }

  findAll(
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
    status?: RestaurantOrderStatus,
  ) {
    const where = buildOrganizationFilter(
      organizationIdFromContext,
      companyIdFromContext,
    ) as Prisma.RestaurantOrderWhereInput;
    if (status) {
      where.status = status;
    }

    return this.prisma.restaurantOrder.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      include: {
        table: true,
        items: { include: { product: true, station: true } },
      },
    });
  }

  async findOne(
    id: number,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    // Validate reservations feature is enabled
    await this.ensureReservationsFeatureEnabled(companyIdFromContext);

    await this.ensureOrder(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.restaurantOrder.findUnique({
      where: { id },
      include: {
        table: true,
        store: { select: { id: true, name: true, adress: true } },
        items: { include: { product: true, station: true } },
        client: true,
      },
    });
  }

  findKitchenQueue(
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
    stationId?: number,
  ) {
    const where = buildOrganizationFilter(
      organizationIdFromContext,
      companyIdFromContext,
    ) as Prisma.RestaurantOrderWhereInput;

    where.status = { in: ['OPEN', 'IN_PROGRESS', 'READY'] };

    return this.prisma.restaurantOrder.findMany({
      where,
      orderBy: { openedAt: 'asc' },
      include: {
        table: true,
        items: {
          where: stationId ? { stationId } : undefined,
          include: {
            product: true,
            station: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async update(
    id: number,
    dto: UpdateRestaurantOrderDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    // Validate reservations feature is enabled
    await this.ensureReservationsFeatureEnabled(companyIdFromContext);

    await this.ensureOrder(id, organizationIdFromContext, companyIdFromContext);

    const isClosing = dto.status === 'CLOSED' || dto.status === 'CANCELLED';
    const closedAt = isClosing ? new Date() : undefined;

    // Fetch current order to detect status transitions
    const currentOrder = await this.prisma.restaurantOrder.findUnique({
      where: { id },
      select: { status: true, organizationId: true, companyId: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.restaurantOrder.update({
        where: { id },
        data: {
          tableId: dto.tableId,
          storeId: dto.storeId,
          notes: dto.notes,
          status: dto.status,
          ...(closedAt ? { closedAt } : {}),
        },
        include: {
          table: true,
          items: { include: { product: true, station: true } },
        },
      });

      // Deduct ingredient stock when order moves to IN_PROGRESS (kitchen starts cooking)
      if (
        dto.status === 'IN_PROGRESS' &&
        currentOrder?.status === 'OPEN'
      ) {
        try {
          const result = await this.ingredientsService.deductForOrder(
            id,
            updated.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
            organizationIdFromContext ?? currentOrder.organizationId ?? null,
            companyIdFromContext ?? currentOrder.companyId ?? null,
            null,
            tx,
          );
          if (result.warnings.length > 0) {
            this.logger.warn(
              `Order #${id} stock warnings: ${result.warnings.join('; ')}`,
            );
          }
        } catch (err) {
          this.logger.error(`Order #${id} ingredient deduction failed: ${err}`);
        }
      }

      // Reverse ingredient deductions when order is cancelled
      if (dto.status === 'CANCELLED' && currentOrder?.status !== 'CANCELLED') {
        try {
          await this.ingredientsService.reverseForOrder(
            id,
            organizationIdFromContext ?? currentOrder?.organizationId ?? null,
            companyIdFromContext ?? currentOrder?.companyId ?? null,
            null,
            tx,
          );
        } catch (err) {
          this.logger.error(`Order #${id} ingredient reversal failed: ${err}`);
        }
      }

      // Auto-release table when order is closed or cancelled
      if (isClosing && updated.tableId) {
        await tx.restaurantTable.update({
          where: { id: updated.tableId },
          data: { status: 'AVAILABLE', currentOrderId: null },
        });
      }

      return updated;
    });

    // Emit WebSocket events after transaction commits
    if (dto.status) {
      this.kitchenGateway.emitOrderUpdate(
        organizationIdFromContext ?? currentOrder?.organizationId ?? null,
        companyIdFromContext ?? currentOrder?.companyId ?? null,
        { orderId: id, status: dto.status, action: 'updated' },
      );
    }

    return result;
  }

  async updateItem(
    id: number,
    dto: UpdateRestaurantOrderItemDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const item = await this.prisma.restaurantOrderItem.findFirst({
      where: {
        id,
        order: buildOrganizationFilter(
          organizationIdFromContext,
          companyIdFromContext,
        ) as Prisma.RestaurantOrderWhereInput,
      },
      include: { order: true },
    });
    if (!item) {
      throw new NotFoundException('Item de comanda no encontrado.');
    }

    const updated = await this.prisma.restaurantOrderItem.update({
      where: { id },
      data: {
        stationId: dto.stationId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        notes: dto.notes,
        status: dto.status,
      },
      include: {
        product: true,
        station: true,
        order: { include: { table: true } },
      },
    });

    // Emit WebSocket event for item update
    this.kitchenGateway.emitOrderUpdate(
      item.order.organizationId ?? null,
      item.order.companyId ?? null,
      { orderId: item.order.id, status: item.order.status, action: 'item_updated' },
    );

    return updated;
  }

  async checkout(
    id: number,
    dto: CheckoutRestaurantOrderDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
    userId?: number | null,
  ) {
    await this.ensureReservationsFeatureEnabled(companyIdFromContext);

    const order = await this.prisma.restaurantOrder.findFirst({
      where: {
        id,
        ...buildOrganizationFilter(organizationIdFromContext, companyIdFromContext),
      } as Prisma.RestaurantOrderWhereInput,
      include: {
        table: true,
        items: { include: { product: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada.');
    }

    if (order.salesId) {
      throw new BadRequestException('Esta orden ya fue cobrada.');
    }

    if (order.status !== 'SERVED' && order.status !== 'READY') {
      throw new BadRequestException(
        `La orden debe estar en estado SERVED o READY para cobrar. Estado actual: ${order.status}`,
      );
    }

    const subtotal = order.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );
    const serviceChargePercent = dto.serviceChargePercent ?? 0;
    const serviceCharge = Number((subtotal * serviceChargePercent / 100).toFixed(2));
    const tip = dto.tip ?? 0;
    const igvRate = 0.18;
    const taxableTotal = subtotal + serviceCharge;
    const igvTotal = Number((taxableTotal * igvRate).toFixed(2));
    const total = taxableTotal + tip;

    const paymentTotal = dto.payments.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(paymentTotal - total) > 0.02) {
      throw new BadRequestException(
        `El monto de pagos (${paymentTotal.toFixed(2)}) no coincide con el total (${total.toFixed(2)}).`,
      );
    }

    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
      select: { id: true, name: true, organizationId: true, companyId: true },
    });
    if (!store) {
      throw new NotFoundException(`Tienda con ID ${dto.storeId} no encontrada.`);
    }

    const resolvedOrgId = organizationIdFromContext ?? store.organizationId ?? order.organizationId;
    const resolvedCompanyId = companyIdFromContext ?? store.companyId ?? order.companyId;

    // Find or create active cash register for the store
    let cashRegister = await this.prisma.cashRegister.findFirst({
      where: { storeId: dto.storeId, status: 'ACTIVE' },
    });
    if (!cashRegister) {
      cashRegister = await this.prisma.cashRegister.create({
        data: {
          storeId: dto.storeId,
          name: `Caja Principal - ${store.name}`,
          initialBalance: new Prisma.Decimal(0),
          currentBalance: new Prisma.Decimal(0),
          status: 'ACTIVE',
          organizationId: resolvedOrgId ?? null,
        },
      });
    }

    // Resolve clientId (use provided, order's, or find generic)
    let clientId = dto.clientId ?? order.clientId;
    if (!clientId) {
      const genericClient = await this.prisma.client.findFirst({
        where: { name: 'Sin Cliente' },
      });
      if (!genericClient) {
        throw new BadRequestException(
          'No se encontro un cliente generico. Registre un cliente o seleccione uno existente.',
        );
      }
      clientId = genericClient.id;
    }

    const tipoMoneda = dto.tipoMoneda ?? 'PEN';
    const tipoComprobante = dto.tipoComprobante ?? 'BOLETA';
    const safeUserId = userId ?? order.createdById ?? 1;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Sale record
      const sale = await tx.sales.create({
        data: {
          userId: safeUserId,
          storeId: dto.storeId,
          clientId,
          total,
          taxableTotal,
          exemptTotal: 0,
          unaffectedTotal: 0,
          igvTotal,
          description: `Orden restaurante #${order.id}`,
          source: 'POS',
          organizationId: resolvedOrgId ?? null,
          companyId: resolvedCompanyId ?? null,
        },
      });

      // 2. Process payments
      const client = await tx.client.findUnique({
        where: { id: clientId! },
        select: { name: true, type: true, typeNumber: true },
      });

      for (const payment of dto.payments) {
        let paymentMethod = await tx.paymentMethod.findUnique({
          where: { id: payment.paymentMethodId },
        });

        if (!paymentMethod) {
          const defaultNames: Record<number, string> = {
            [-1]: 'EN EFECTIVO',
            [-2]: 'TRANSFERENCIA',
            [-3]: 'PAGO CON VISA',
            [-4]: 'YAPE',
            [-5]: 'PLIN',
            [-6]: 'OTRO MEDIO DE PAGO',
          };
          const methodName = defaultNames[payment.paymentMethodId];
          if (!methodName) {
            throw new BadRequestException(
              `Metodo de pago no valido: ${payment.paymentMethodId}`,
            );
          }
          paymentMethod = await tx.paymentMethod.findFirst({
            where: { name: methodName },
          });
          if (!paymentMethod) {
            paymentMethod = await tx.paymentMethod.create({
              data: { name: methodName, isActive: true },
            });
          }
        }

        const transaction = await tx.cashTransaction.create({
          data: {
            cashRegisterId: cashRegister!.id,
            type: 'INCOME',
            amount: new Prisma.Decimal(payment.amount),
            description: `Orden restaurante #${order.id} - ${paymentMethod.name}`,
            userId: safeUserId,
            clientName: client?.name ?? null,
            clientDocument: client?.typeNumber ?? null,
            clientDocumentType: client?.type ?? null,
            organizationId: resolvedOrgId ?? null,
          },
        });

        await tx.cashTransactionPaymentMethod.create({
          data: {
            cashTransactionId: transaction.id,
            paymentMethodId: paymentMethod.id,
          },
        });

        await tx.salePayment.create({
          data: {
            salesId: sale.id,
            paymentMethodId: paymentMethod.id,
            amount: payment.amount,
            currency: payment.currency ?? tipoMoneda,
            transactionId: payment.transactionId ?? null,
            cashTransactionId: transaction.id,
            companyId: resolvedCompanyId!,
          },
        });
      }

      // 3. Create invoice if not SIN COMPROBANTE
      if (tipoComprobante !== 'SIN COMPROBANTE' && resolvedCompanyId) {
        const normalizedType = tipoComprobante.toUpperCase();
        let sequence = await tx.companyDocumentSequence.findUnique({
          where: {
            companyId_documentType: {
              companyId: resolvedCompanyId,
              documentType: normalizedType,
            },
          },
        });
        if (!sequence) {
          const fallbackSerie =
            normalizedType === 'FACTURA' ? 'F001'
              : normalizedType === 'BOLETA' ? 'B001'
              : 'S001';
          sequence = await tx.companyDocumentSequence.create({
            data: {
              companyId: resolvedCompanyId,
              documentType: normalizedType,
              serie: fallbackSerie,
              nextCorrelative: 1,
              correlativeLength: 3,
            },
          });
        }

        const correlativo = String(sequence.nextCorrelative).padStart(
          sequence.correlativeLength,
          '0',
        );

        await tx.invoiceSales.create({
          data: {
            salesId: sale.id,
            companyId: resolvedCompanyId,
            serie: sequence.serie,
            nroCorrelativo: correlativo,
            tipoComprobante: normalizedType,
            tipoMoneda,
            total,
            fechaEmision: new Date(),
          },
        });

        await tx.companyDocumentSequence.update({
          where: { id: sequence.id },
          data: { nextCorrelative: sequence.nextCorrelative + 1 },
        });
      }

      // 4. Update cash register balance
      await tx.cashRegister.update({
        where: { id: cashRegister!.id },
        data: {
          currentBalance: cashRegister!.currentBalance.add(
            new Prisma.Decimal(total),
          ),
        },
      });

      // 5. Update restaurant order: link sale, close order, update totals
      const updatedOrder = await tx.restaurantOrder.update({
        where: { id: order.id },
        data: {
          salesId: sale.id,
          status: 'CLOSED',
          closedAt: new Date(),
          subtotal,
          tax: igvTotal,
          serviceCharge,
          total,
        },
        include: {
          table: true,
          items: { include: { product: true, station: true } },
        },
      });

      // 6. Release table if DINE_IN
      if (updatedOrder.tableId) {
        await tx.restaurantTable.update({
          where: { id: updatedOrder.tableId },
          data: { status: 'AVAILABLE', currentOrderId: null },
        });
      }

      return { order: updatedOrder, salesId: sale.id };
    });

    this.logger.log(`Checkout completed for order #${id}, sale #${result.salesId}`);

    // Emit WebSocket events for checkout
    this.kitchenGateway.emitOrderUpdate(
      resolvedOrgId ?? null,
      resolvedCompanyId ?? null,
      { orderId: id, status: 'CLOSED', action: 'checkout' },
    );
    if (order.tableId) {
      this.kitchenGateway.emitTableUpdate(
        resolvedOrgId ?? null,
        resolvedCompanyId ?? null,
        { tableId: order.tableId, status: 'AVAILABLE' },
      );
    }

    return result;
  }

  private async ensureOrder(
    id: number,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const order = await this.prisma.restaurantOrder.findFirst({
      where: {
        id,
        ...buildOrganizationFilter(
          organizationIdFromContext,
          companyIdFromContext,
        ),
      } as Prisma.RestaurantOrderWhereInput,
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada.');
    }
  }
}
