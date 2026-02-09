import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RestaurantOrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildOrganizationFilter, resolveCompanyId } from 'src/tenancy/organization.utils';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { UpdateRestaurantOrderDto } from './dto/update-restaurant-order.dto';
import { UpdateRestaurantOrderItemDto } from './dto/update-restaurant-order-item.dto';

@Injectable()
export class RestaurantOrdersService {
  constructor(private readonly prisma: PrismaService) {}

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

    const subtotal = dto.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );
    const normalizedOrderType =
      dto.orderType === 'TAKEOUT'
        ? 'TAKEAWAY'
        : (dto.orderType ?? 'DINE_IN');

    return this.prisma.$transaction(async (tx) => {
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

      return tx.restaurantOrder.findUnique({
        where: { id: order.id },
        include: {
          table: true,
          items: { include: { product: true, station: true } },
        },
      });
    });
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
    await this.ensureOrder(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.restaurantOrder.findUnique({
      where: { id },
      include: {
        table: true,
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
    await this.ensureOrder(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.restaurantOrder.update({
      where: { id },
      data: {
        tableId: dto.tableId,
        storeId: dto.storeId,
        notes: dto.notes,
        status: dto.status,
      },
      include: {
        table: true,
        items: { include: { product: true, station: true } },
      },
    });
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

    return this.prisma.restaurantOrderItem.update({
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
