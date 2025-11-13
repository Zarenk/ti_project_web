import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, AuditAction, OrderStatus } from '@prisma/client';
import {
  zonedTimeToUtc,
  utcToZonedTime,
  format as formatTz,
} from 'date-fns-tz';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { eachDayOfInterval } from 'date-fns';
import {
  executeSale,
  prepareSaleContext,
  SaleAllocation,
} from 'src/utils/sales-helper';
import { ActivityService } from 'src/activity/activity.service';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import {
  buildOrganizationFilter,
  resolveCompanyId,
  resolveOrganizationId,
} from 'src/tenancy/organization.utils';
import { InventoryHistoryUncheckedCreateInputWithOrganization } from 'src/tenancy/prisma-organization.types';
import { SunatService } from 'src/sunat/sunat.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  private buildSalesWhere(
    organizationId?: number | null,
    companyId?: number | null,
  ): Prisma.SalesWhereInput {
    return buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.SalesWhereInput;
  }

  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly accountingHook: AccountingHook,
    private readonly sunatService: SunatService,
  ) {}

  // MÃ©todo para crear una venta
  async createSale(data: {
    userId: number;
    storeId: number;
    clientId?: number;
    total: number;
    description?: string;
    details: {
      productId: number;
      quantity: number;
      price: number;
      series?: string[];
    }[];
    tipoComprobante?: string;
    tipoMoneda: string;
    payments: { paymentMethodId: number; amount: number; currency: string }[];
    organizationId?: number | null;
    companyId?: number | null;
  }) {
    const {
      userId,
      storeId,
      clientId,
      description,
      details,
      payments,
      tipoComprobante,
      tipoMoneda,
      organizationId: inputOrganizationId,
      companyId: inputCompanyId,
    } = data;

    const { store, cashRegister, clientIdToUse } = await prepareSaleContext(
      this.prisma,
      storeId,
      clientId,
    );

    const storeOrganizationId =
      (store as { organizationId?: number | null } | undefined)
        ?.organizationId ?? null;

    const storeCompanyId =
      (store as { companyId?: number | null } | undefined)?.companyId ?? null;

    const companyId = resolveCompanyId({
      provided: inputCompanyId ?? null,
      fallbacks: [storeCompanyId],
      mismatchError:
        'La compania proporcionada no coincide con la tienda seleccionada.',
    });

    const organizationId = resolveOrganizationId({
      provided: inputOrganizationId ?? null,
      fallbacks: [storeOrganizationId],
      mismatchError:
        'La organizaciÃ³n proporcionada no coincide con la tienda seleccionada.',
    });

    logOrganizationContext({
      service: SalesService.name,
      operation: 'createSale',
      organizationId,
      companyId,
      metadata: { storeId, userId, clientId: clientIdToUse ?? clientId },
    });

    // Validar stock, calcular el total y preparar las asignaciones de inventario
    const allocations: SaleAllocation[] = [];
    let total = 0;
    for (const detail of details) {
      const inventoryFilter = {
        productId: detail.productId,
        ...(buildOrganizationFilter(
          organizationId,
        ) as Prisma.InventoryWhereInput),
      } as Prisma.InventoryWhereInput;

      const storeFilter = {
        ...(buildOrganizationFilter(organizationId) as Prisma.StoreWhereInput),
      } as Prisma.StoreWhereInput;

      if (companyId !== null) {
        storeFilter.companyId = companyId;
      }

      const storeInventory = await this.prisma.storeOnInventory.findFirst({
        where: {
          storeId,
          inventory: inventoryFilter,
          store: storeFilter,
        },
      });

      if (!storeInventory || storeInventory.stock < detail.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto con ID ${detail.productId} en la tienda ${storeId}.`,
        );
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
      source: 'POS',
      getStoreName: () => store.name,
      organizationId,
      companyId,
      onSalePosted: async (id) => {
        try {
          await this.accountingHook.postSale(id);
        } catch (err) {
          this.logger.warn(`Retrying accounting post for sale ${id}`);
        }
      },
    });

    const invoice = await this.prisma.invoiceSales.findFirst({
      where: { salesId: sale.id },
      orderBy: { createdAt: 'desc' },
      select: { serie: true, nroCorrelativo: true, tipoComprobante: true },
    });

    const salePayments = await this.prisma.salePayment.findMany({
      where: { salesId: sale.id },
      select: { id: true },
    });

    for (const payment of salePayments) {
      try {
        await this.accountingHook.postPayment(payment.id);
      } catch (err) {
        this.logger.warn(`Retrying accounting post for payment ${payment.id}`);
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    await this.activityService.log({
      actorId: userId,
      actorEmail: user?.username,
      entityType: 'Sale',
      entityId: sale.id.toString(),
      action: AuditAction.CREATED,
      summary: `Venta ${sale.id} por ${sale.total} realizada por ${user?.username ?? 'ID ' + userId}`,
      diff: { after: sale } as any,
    });

    await this.triggerSunatIfNeeded({
      saleId: sale.id,
      invoice,
      companyId,
      storeName: store.name,
      tipoComprobante,
    });

    return sale;
  }

  private async triggerSunatIfNeeded(params: {
    saleId: number;
    invoice?: {
      serie: string | null | undefined;
      nroCorrelativo: string | null | undefined;
      tipoComprobante: string | null | undefined;
    } | null;
    tipoComprobante?: string;
    companyId: number | null;
    storeName: string;
  }) {
    const { saleId, companyId, tipoComprobante, invoice } = params;

    const shouldSend =
      (invoice?.tipoComprobante || tipoComprobante)?.toUpperCase() ===
        'FACTURA' ||
      (invoice?.tipoComprobante || tipoComprobante)?.toUpperCase() === 'BOLETA';

    if (!shouldSend || !companyId) {
      return;
    }

    try {
      await this.sunatService.sendDocument({
        companyId,
        documentType:
          (invoice?.tipoComprobante || tipoComprobante)?.toUpperCase() ===
          'FACTURA'
            ? 'invoice'
            : 'boleta',
        documentData: {
          serie: invoice?.serie,
          correlativo: invoice?.nroCorrelativo,
          emisor: { razonSocial: params.storeName },
        },
        saleId,
      });
    } catch (error: any) {
      this.logger.error(
        `No se pudo enviar la venta ${saleId} a SUNAT: ${error?.message ?? 'Error desconocido'}`,
      );
    }
  }

  async findAllSales(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const organizationFilter = this.buildSalesWhere(organizationId, companyId);

    const sales = await this.prisma.sales.findMany({
      where: organizationFilter,
      include: {
        user: true,
        store: true,
        client: true,
        salesDetails: {
          include: {
            entryDetail: {
              include: {
                product: true, // Incluir el producto a travÃ©s de EntryDetail
              },
            },
            storeOnInventory: {
              include: {
                inventory: {
                  include: {
                    product: true, // Incluir el producto a travÃ©s de StoreOnInventory
                  },
                },
              },
            },
          },
        },
        sunatTransmissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            ticket: true,
            environment: true,
            errorMessage: true,
            updatedAt: true,
            createdAt: true,
          },
        },
      },
    });

    return sales.map((sale) =>
      this.mapSaleWithSunatStatus(sale, { includeHistory: false }),
    );
  }

  async findSalesByUser(
    userId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const organizationFilter = this.buildSalesWhere(organizationId, companyId);
    return this.prisma.sales.findMany({
      where: { client: { userId }, ...organizationFilter },
      include: {
        user: true,
        store: true,
        client: true,
        salesDetails: {
          include: {
            entryDetail: {
              include: {
                product: true,
              },
            },
            storeOnInventory: {
              include: {
                inventory: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
        invoices: true,
        payments: true,
      },
    });
  }

  async findOne(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const sale = await this.prisma.sales.findFirst({
      where: { id, ...this.buildSalesWhere(organizationId, companyId) },
      include: {
        user: { select: { username: true } },
        store: { select: { name: true } },
        client: { select: { name: true } },
        salesDetails: {
          include: {
            entryDetail: { include: { product: true } },
            storeOnInventory: true,
          },
        },
        payments: { include: { paymentMethod: true } },
        invoices: true,
        sunatTransmissions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(`No se encontr�� la venta con ID ${id}.`);
    }

    return this.mapSaleWithSunatStatus(sale, { includeHistory: true });
  }
  async deleteSale(
    id: number,
    actorId?: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const organizationFilter = this.buildSalesWhere(organizationId, companyId);
    const { sale, deletedSale } = await this.prisma.$transaction(
      async (prismaTx) => {
        const sale = await prismaTx.sales.findFirst({
          where: { id, ...organizationFilter },
          include: {
            user: { select: { id: true, username: true } },
            store: { select: { id: true, name: true } },
            client: {
              select: { id: true, name: true, type: true, typeNumber: true },
            },
            salesDetails: {
              include: {
                entryDetail: {
                  include: {
                    product: { select: { id: true, name: true } },
                  },
                },
                storeOnInventory: true,
              },
            },
            payments: {
              include: {
                paymentMethod: { select: { id: true, name: true } },
                cashTransaction: {
                  select: {
                    id: true,
                    cashRegisterId: true,
                    amount: true,
                  },
                },
              },
            },
            shippingGuides: { select: { id: true } },
            order: { select: { id: true } },
          },
        });

        if (!sale) {
          throw new NotFoundException(`No se encontro la venta con ID ${id}.`);
        }

        const saleOrganizationId =
          (sale as { organizationId?: number | null }).organizationId ?? null;

        for (const detail of sale.salesDetails) {
          const inventoryRecord = await prismaTx.storeOnInventory.findUnique({
            where: { id: detail.storeOnInventoryId },
          });

          if (!inventoryRecord) {
            throw new NotFoundException(`No se encontro la venta con ID ${id}.`);
          }

          await prismaTx.storeOnInventory.update({
            where: { id: inventoryRecord.id },
            data: { stock: { increment: detail.quantity } },
          });

          const inventoryHistoryData: InventoryHistoryUncheckedCreateInputWithOrganization =
            {
              inventoryId: inventoryRecord.inventoryId,
              userId: actorId ?? sale.userId,
              action: 'sale_deleted',
              description: `Reversion de la venta ${sale.id} en ${sale.store.name}`,
              stockChange: detail.quantity,
              previousStock: inventoryRecord.stock,
              newStock: inventoryRecord.stock + detail.quantity,
              organizationId: saleOrganizationId,
            };

          await prismaTx.inventoryHistory.create({
            data: inventoryHistoryData,
          });

          if (detail.series && detail.series.length > 0) {
            await prismaTx.entryDetailSeries.updateMany({
              where: {
                serial: { in: detail.series },
                entryDetailId: detail.entryDetailId, // ensures the exact relation
                organizationId: saleOrganizationId,
              },
              data: { status: 'active' },
            });
          }
        }

        for (const payment of sale.payments) {
          if (payment.cashTransaction) {
            await prismaTx.cashTransactionPaymentMethod.deleteMany({
              where: { cashTransactionId: payment.cashTransaction.id },
            });

            await prismaTx.cashRegister.update({
              where: { id: payment.cashTransaction.cashRegisterId },
              data: {
                currentBalance: {
                  decrement: new Prisma.Decimal(payment.amount),
                },
              },
            });

            await prismaTx.cashTransaction.delete({
              where: { id: payment.cashTransaction.id },
            });
          }
        }

        await prismaTx.salePayment.deleteMany({ where: { salesId: sale.id } });

        if (sale.shippingGuides.length > 0) {
          await prismaTx.shippingGuide.updateMany({
            where: { ventaId: sale.id },
            data: { ventaId: null },
          });
        }

        if (sale.order) {
          await prismaTx.orders.update({
            where: { id: sale.order.id },
            data: { salesId: null, status: OrderStatus.PENDING },
          });
        }

        await prismaTx.invoiceSales.deleteMany({ where: { salesId: sale.id } });

        const deletedSale = await prismaTx.sales.delete({
          where: { id: sale.id },
        });

        return { sale, deletedSale };
      },
    );

    const beforeData = {
      id: sale.id,
      total: sale.total,
      store: sale.store?.name,
      client: sale.client?.name,
      details: sale.salesDetails.map((detail) => ({
        productId: detail.productId,
        productName: detail.entryDetail.product.name,
        quantity: detail.quantity,
        price: detail.price,
        series: detail.series ?? [],
      })),
      payments: sale.payments.map((payment) => ({
        id: payment.id,
        method: payment.paymentMethod?.name,
        amount: payment.amount,
        currency: payment.currency,
      })),
    };

    await this.activityService.log({
      actorId: actorId ?? sale.userId,
      entityType: 'Sale',
      entityId: sale.id.toString(),
      action: AuditAction.DELETED,
      summary: `Venta ${sale.id} eliminada y stock revertido`,
      diff: { before: beforeData } as any,
    });

    return deletedSale;
  }

  async getSaleSunatTransmissions(
    saleId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const sale = await this.prisma.sales.findFirst({
      where: { id: saleId, ...this.buildSalesWhere(organizationId, companyId) },
      select: { id: true },
    });

    if (!sale) {
      throw new NotFoundException(
        `No se encontro la venta con ID ${saleId}.`,
      );
    }

    return this.prisma.sunatTransmission.findMany({
      where: { saleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // MÃ©todo para obtener las series vendidas en una venta especÃ­fica
  async getSoldSeriesBySale(
    saleId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    // Buscar la venta con los detalles y las series asociadas
    const sale = await this.prisma.sales.findFirst({
      where: {
        id: saleId,
        ...this.buildSalesWhere(organizationId, companyId),
      },
      include: {
        salesDetails: {
          include: {
            entryDetail: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException(
        `No se encontro la venta con ID ${saleId}.`,
      );
    }

    // Formatear los datos para devolver solo las series vendidas
    const soldSeries = sale.salesDetails.map((detail) => ({
      productId: detail.entryDetail.product.id, // Acceder al producto a travÃ©s de EntryDetail
      productName: detail.entryDetail.product.name,
      series: detail.series ?? [],
    }));

    return {
      saleId: sale.id,
      soldSeries,
    };
  }

  async getMonthlySalesTotal(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(startOfCurrentMonth.getTime() - 1); // 1 dÃ­a antes del inicio del mes actual

    const organizationFilter = this.buildSalesWhere(organizationId, companyId);

    const [currentMonth, previousMonth] = await Promise.all([
      this.prisma.sales.aggregate({
        _sum: { total: true },
        where: {
          ...organizationFilter,
          createdAt: { gte: startOfCurrentMonth, lte: now },
        },
      }),
      this.prisma.sales.aggregate({
        _sum: { total: true },
        where: {
          ...organizationFilter,
          createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
        },
      }),
    ]);

    const totalCurrent = currentMonth._sum.total || 0;
    const totalPrevious = previousMonth._sum.total || 0;

    const growthPercentage =
      totalPrevious > 0
        ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
        : null;

    return {
      total: totalCurrent,
      growth: growthPercentage, // puede ser null si no hubo ventas el mes pasado
    };
  }

  async getRevenueByCategory(
    startDate?: Date,
    endDate?: Date,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const timeZone = 'America/Lima';
    const filters: any = {};

    if (startDate && endDate) {
      filters.createdAt = {
        gte: zonedTimeToUtc(startDate, timeZone),
        lte: zonedTimeToUtc(endDate, timeZone),
      };
    }

    const sales = await this.prisma.sales.findMany({
      where: {
        ...filters,
        ...this.buildSalesWhere(organizationId, companyId),
      },
      select: { id: true },
    });

    const salesIds = sales.map((s) => s.id);

    const result = await this.prisma.salesDetail.findMany({
      where: { salesId: { in: salesIds } },
    });

    const productIds = result.map((r) => r.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });

    const revenueByCategory: Record<string, number> = {};

    for (const detail of result) {
      const product = products.find((p) => p.id === detail.productId);
      const categoryName = product?.category?.name || 'Sin categorÃ­a';
      const revenue = (detail.quantity || 0) * (detail.price || 0);
      revenueByCategory[categoryName] =
        (revenueByCategory[categoryName] || 0) + revenue;
    }

    return Object.entries(revenueByCategory).map(([name, value]) => ({
      name,
      value,
    }));
  }

  async getDailySalesByDateRange(
    from: Date,
    to: Date,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const timeZone = 'America/Lima';

    const zonedFrom = zonedTimeToUtc(new Date(from), timeZone);
    const zonedTo = zonedTimeToUtc(new Date(to), timeZone);

    const sales = await this.prisma.sales.findMany({
      where: {
        ...this.buildSalesWhere(organizationId, companyId),
        createdAt: {
          gte: zonedFrom,
          lte: zonedTo,
        },
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    const salesByDate: Record<string, number> = {};

    for (const sale of sales) {
      const zonedDate = utcToZonedTime(sale.createdAt, timeZone);
      const dateKey = formatTz(zonedDate, 'yyyy-MM-dd', { timeZone });
      salesByDate[dateKey] = (salesByDate[dateKey] || 0) + sale.total;
    }

    const days = eachDayOfInterval({ start: from, end: to });
    const result = days.map((date) => {
      const dateKey = formatTz(utcToZonedTime(date, timeZone), 'yyyy-MM-dd', {
        timeZone,
      });
      return {
        date: dateKey,
        sales: salesByDate[dateKey] || 0,
      };
    });

    return result;
  }

  async getTopProducts(
    limit = 10,
    startDate?: string,
    endDate?: string,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const filters: Prisma.SalesDetailWhereInput = {};
    if (organizationId !== undefined || companyId !== undefined) {
      filters.sale = this.buildSalesWhere(organizationId, companyId);
    }
    const timeZone = 'America/Lima';

    if (startDate && endDate) {
      const zonedFrom = zonedTimeToUtc(new Date(startDate), timeZone);
      const zonedTo = zonedTimeToUtc(new Date(endDate), timeZone);

      const salesInRange = await this.prisma.sales.findMany({
        where: {
          ...this.buildSalesWhere(organizationId, companyId),
          createdAt: {
            gte: zonedFrom,
            lte: zonedTo,
          },
        },
        select: { id: true },
      });

      const salesIds = salesInRange.map((s) => s.id);
      filters.salesId = { in: salesIds };
    }

    const details = await this.prisma.salesDetail.findMany({
      where: filters,
      include: { sale: true },
    });

    const statsMap: Record<
      number,
      { quantity: number; revenue: number; lastSale: Date }
    > = {};
    for (const detail of details) {
      if (!statsMap[detail.productId]) {
        statsMap[detail.productId] = {
          quantity: 0,
          revenue: 0,
          lastSale: detail.sale.createdAt,
        };
      }
      statsMap[detail.productId].quantity += detail.quantity;
      statsMap[detail.productId].revenue += detail.quantity * detail.price;
      if (detail.sale.createdAt > statsMap[detail.productId].lastSale) {
        statsMap[detail.productId].lastSale = detail.sale.createdAt;
      }
    }

    const sorted = Object.entries(statsMap)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, limit);

    const productIds = sorted.map(([productId]) => Number(productId));
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    return sorted.map(([productId, stats]) => {
      const product = products.find((p) => p.id === Number(productId));
      return {
        productId: Number(productId),
        name: product?.name || 'Producto desconocido',
        sales: stats.quantity,
        revenue: stats.revenue,
        lastSale: stats.lastSale,
      };
    });
  }

  async getProductReportOptions(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.ProductWhereInput;

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        price: true,
        priceSell: true,
        barcode: true,
        qrCode: true,
        category: { select: { name: true } },
        inventory: {
          select: {
            storeOnInventory: {
              select: { stock: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((product) => {
      const resolvedPrice =
        typeof product.priceSell === 'number' && product.priceSell > 0
          ? product.priceSell
          : (product.price ?? 0);

      const aggregatedStock = product.inventory.reduce((total, inventory) => {
        if (!inventory.storeOnInventory) {
          return total;
        }
        const storeStock = inventory.storeOnInventory.reduce(
          (sum, store) =>
            sum + (typeof store.stock === 'number' ? store.stock : 0),
          0,
        );
        return total + storeStock;
      }, 0);

      const searchPieces = [
        product.name ?? '',
        product.category?.name ?? '',
        product.barcode ?? '',
        product.qrCode ?? '',
      ]
        .filter(
          (value): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        )
        .map((value) =>
          value
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, ''),
        );

      return {
        id: product.id,
        name: product.name,
        price: resolvedPrice,
        stock: aggregatedStock,
        categoryName: product.category?.name ?? null,
        searchKey: searchPieces.join(' ').trim(),
      };
    });
  }

  async getProductSalesReport(
    productId: number,
    from?: string,
    to?: string,
    organizationId?: number | null,
    companyId?: number | null, // â† AÃ‘ADIDO
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        barcode: true,
        price: true,
        priceSell: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `No se encontro el producto con ID ${productId}.`,
      );
    }

    const timeZone = 'America/Lima';
    const createdAtFilter: Prisma.DateTimeFilter = {};

    if (from) {
      createdAtFilter.gte = zonedTimeToUtc(
        startOfDay(new Date(from)),
        timeZone,
      );
    }

    if (to) {
      createdAtFilter.lte = zonedTimeToUtc(endOfDay(new Date(to)), timeZone);
    }

    const where: Prisma.SalesDetailWhereInput = { productId };
    const saleFilters: Prisma.SalesWhereInput = this.buildSalesWhere(
      organizationId,
      companyId,
    );

    if (Object.keys(createdAtFilter).length > 0) {
      saleFilters.createdAt = createdAtFilter;
    }

    if (Object.keys(saleFilters).length > 0) {
      where.sale = saleFilters;
    }

    const details = await this.prisma.salesDetail.findMany({
      where,
      include: {
        sale: {
          select: {
            id: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { sale: { createdAt: 'asc' } },
    });

    let totalUnits = 0;
    let totalRevenue = 0;
    let latestSaleDate: Date | null = null;
    let highestPrice: number | null = null;
    let lowestPrice: number | null = null;

    const uniqueSalesIds = new Set<number>();
    const sellerStats = new Map<
      number,
      {
        userId: number;
        username: string;
        totalUnits: number;
        totalRevenue: number;
        saleIds: Set<number>;
      }
    >();
    const clientStats = new Map<
      number,
      {
        clientId: number;
        name: string;
        totalUnits: number;
        totalRevenue: number;
        saleIds: Set<number>;
        lastPurchase: Date;
      }
    >();
    const timeline = new Map<string, { quantity: number; revenue: number }>();

    for (const detail of details) {
      const sale = detail.sale;
      if (!sale) continue;

      const quantity = detail.quantity ?? 0;
      const price = detail.price ?? 0;
      const revenue = quantity * price;

      totalUnits += quantity;
      totalRevenue += revenue;
      uniqueSalesIds.add(sale.id);

      if (typeof price === 'number') {
        highestPrice =
          highestPrice === null ? price : Math.max(highestPrice, price);
        lowestPrice =
          lowestPrice === null ? price : Math.min(lowestPrice, price);
      }

      const saleDate = sale.createdAt;
      if (!latestSaleDate || saleDate > latestSaleDate) {
        latestSaleDate = saleDate;
      }

      const zonedDate = utcToZonedTime(saleDate, timeZone);
      const dateKey = formatTz(zonedDate, 'yyyy-MM-dd', { timeZone });
      const timelineEntry = timeline.get(dateKey) ?? {
        quantity: 0,
        revenue: 0,
      };
      timelineEntry.quantity += quantity;
      timelineEntry.revenue += revenue;
      timeline.set(dateKey, timelineEntry);

      if (sale.user) {
        const username =
          sale.user.username ?? sale.user.email ?? `Usuario ${sale.user.id}`;
        const current = sellerStats.get(sale.user.id) ?? {
          userId: sale.user.id,
          username,
          totalUnits: 0,
          totalRevenue: 0,
          saleIds: new Set<number>(),
        };
        current.totalUnits += quantity;
        current.totalRevenue += revenue;
        current.saleIds.add(sale.id);
        sellerStats.set(sale.user.id, current);
      }

      if (sale.client) {
        const current = clientStats.get(sale.client.id) ?? {
          clientId: sale.client.id,
          name: sale.client.name ?? `Cliente ${sale.client.id}`,
          totalUnits: 0,
          totalRevenue: 0,
          saleIds: new Set<number>(),
          lastPurchase: saleDate,
        };
        current.totalUnits += quantity;
        current.totalRevenue += revenue;
        current.saleIds.add(sale.id);
        if (saleDate > current.lastPurchase) {
          current.lastPurchase = saleDate;
        }
        clientStats.set(sale.client.id, current);
      }
    }

    const sellers = Array.from(sellerStats.values()).map((item) => ({
      userId: item.userId,
      username: item.username,
      totalUnits: item.totalUnits,
      totalRevenue: item.totalRevenue,
      salesCount: item.saleIds.size,
    }));

    sellers.sort((a, b) => b.totalUnits - a.totalUnits);
    const topSeller = sellers.length > 0 ? sellers[0] : null;

    const topClients = Array.from(clientStats.values())
      .map((item) => ({
        clientId: item.clientId,
        name: item.name,
        totalUnits: item.totalUnits,
        totalRevenue: item.totalRevenue,
        salesCount: item.saleIds.size,
        lastPurchase: item.lastPurchase.toISOString(),
      }))
      .sort((a, b) => b.totalUnits - a.totalUnits)
      .slice(0, 10);

    const timelineSeries = Array.from(timeline.entries())
      .map(([date, stats]) => ({
        date,
        quantity: stats.quantity,
        revenue: stats.revenue,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const inventory = await this.prisma.storeOnInventory.findMany({
      where: { inventory: { productId } },
      select: {
        stock: true,
        storeId: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const stockByStore = inventory.map((item) => ({
      storeId: item.storeId,
      storeName: item.store?.name ?? `Tienda ${item.storeId}`,
      stock: item.stock ?? 0,
    }));

    const totalStock = stockByStore.reduce(
      (sum, record) => sum + (record.stock ?? 0),
      0,
    );

    return {
      product,
      metrics: {
        totalUnitsSold: totalUnits,
        totalRevenue,
        totalOrders: uniqueSalesIds.size,
        averageUnitPrice: totalUnits > 0 ? totalRevenue / totalUnits : 0,
        highestPrice,
        lowestPrice,
        lastSaleDate: latestSaleDate ? latestSaleDate.toISOString() : null,
        currency: 'PEN',
      },
      topSeller,
      topClients,
      stock: {
        total: totalStock,
        byStore: stockByStore,
      },
      timeline: timelineSeries,
    };
  }

  async getMonthlySalesCount(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(startOfCurrentMonth.getTime() - 1);

    const organizationFilter = this.buildSalesWhere(organizationId, companyId);

    const [currentCount, previousCount] = await Promise.all([
      this.prisma.sales.count({
        where: {
          ...organizationFilter,
          createdAt: { gte: startOfCurrentMonth, lte: now },
        },
      }),
      this.prisma.sales.count({
        where: {
          ...organizationFilter,
          createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
        },
      }),
    ]);

    const growth =
      previousCount > 0
        ? ((currentCount - previousCount) / previousCount) * 100
        : null;

    return {
      count: currentCount,
      growth,
    };
  }

  async getMonthlyClientStats(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(startOfCurrentMonth.getTime() - 1);

    const organizationFilter = this.buildSalesWhere(organizationId, companyId);

    const [currentClients, previousClients] = await Promise.all([
      this.prisma.sales.findMany({
        where: {
          ...organizationFilter,
          createdAt: {
            gte: startOfCurrentMonth,
            lte: now,
          },
        },
        select: { clientId: true },
        distinct: ['clientId'],
      }),
      this.prisma.sales.findMany({
        where: {
          ...organizationFilter,
          createdAt: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth,
          },
        },
        select: { clientId: true },
        distinct: ['clientId'],
      }),
    ]);

    const currentTotal = currentClients.length;
    const previousTotal = previousClients.length;

    const growth =
      previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : null;

    return {
      total: currentTotal,
      growth,
    };
  }

  async getRecentSales(
    from?: string,
    to?: string,
    limit: number = 10,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const timeZone = 'America/Lima';

    const organizationFilter = this.buildSalesWhere(organizationId, companyId);

    const whereClause: Prisma.SalesWhereInput | undefined = (() => {
      const base: Prisma.SalesWhereInput = { ...organizationFilter };

      if (from && to) {
        base.createdAt = {
          gte: zonedTimeToUtc(new Date(from), timeZone),
          lte: zonedTimeToUtc(endOfDay(new Date(to)), timeZone), // ðŸ‘ˆ Asegura fin del dÃ­a
        };
      }

      return Object.keys(base).length > 0 ? base : undefined;
    })();

    const sales = await this.prisma.sales.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { username: true } },
        store: { select: { name: true } },
        client: { select: { name: true } },
        salesDetails: {
          include: {
            entryDetail: {
              include: {
                product: { select: { name: true } },
                series: true,
              },
            },
          },
        },
        invoices: true,
      },
    });

    return sales.map((sale) => {
      const invoice = sale.invoices[0];
      return {
        id: sale.id,
        user: sale.user.username,
        store: sale.store.name,
        client: sale.client.name,
        source: sale.source,
        total: sale.total,
        createdAt: sale.createdAt,
        products: sale.salesDetails.map((detail) => ({
          name: detail.entryDetail.product.name,
          quantity: detail.quantity,
          price: detail.price,
          series: Array.isArray(detail.series)
            ? detail.series.filter(
                (value): value is string =>
                  typeof value === 'string' && value.length > 0,
              )
            : [],
        })),
        invoice: invoice
          ? {
              serie: invoice.serie,
              nroCorrelativo: invoice.nroCorrelativo,
              tipoComprobante: invoice.tipoComprobante,
            }
          : null,
      };
    });
  }

  async getTopClients(
    limit = 10,
    from?: string,
    to?: string,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const timeZone = 'America/Lima';
    const where: Prisma.SalesWhereInput = this.buildSalesWhere(
      organizationId,
      companyId,
    );

    if (from && to) {
      where.createdAt = {
        gte: zonedTimeToUtc(new Date(from), timeZone),
        lte: zonedTimeToUtc(endOfDay(new Date(to)), timeZone),
      };
    }

    const grouped = await this.prisma.sales.groupBy({
      by: ['clientId'],
      where,
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const clientIds = grouped.map((g) => g.clientId);

    const [clients, sales] = await Promise.all([
      this.prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true },
      }),
      this.prisma.sales.findMany({
        where: { clientId: { in: clientIds }, ...where },
        include: {
          salesDetails: {
            include: {
              entryDetail: { include: { product: true } },
            },
          },
          invoices: true,
        },
      }),
    ]);

    return grouped.map((g) => {
      const client = clients.find((c) => c.id === g.clientId);
      const clientSales = sales.filter((s) => s.clientId === g.clientId);
      return {
        clientId: g.clientId,
        clientName: client?.name ?? 'Desconocido',
        totalAmount: g._sum.total ?? 0,
        salesCount: g._count._all ?? 0,
        sales: clientSales.map((s) => ({
          id: s.id,
          total: s.total,
          createdAt: s.createdAt,
          invoice: s.invoices[0]
            ? {
                serie: s.invoices[0].serie,
                nroCorrelativo: s.invoices[0].nroCorrelativo,
                tipoComprobante: s.invoices[0].tipoComprobante,
              }
            : null,
          products: s.salesDetails.map((d) => ({
            name: d.entryDetail.product.name,
            quantity: d.quantity,
            price: d.price,
          })),
        })),
      };
    });
  }

  async getSalesTransactions(
    from?: Date,
    to?: Date,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where: Prisma.SalesWhereInput = this.buildSalesWhere(
      organizationId,
      companyId,
    );

    if (from || to) {
      where.createdAt = {};
      if (from) {
        // Greater than or equal to the start date
        where.createdAt.gte = from;
      }
      if (to) {
        // Less than or equal to the end date
        where.createdAt.lte = to;
      }
    }

    const sales = await this.prisma.sales.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        invoices: true,
        payments: { include: { paymentMethod: true } },
        salesDetails: {
          include: {
            entryDetail: {
              include: {
                product: true,
                series: true,
              },
            },
          },
        },
        sunatTransmissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return sales.map((sale) => {
      const invoice = sale.invoices?.[0];
      const sunatStatus = this.extractSunatStatus(
        sale.sunatTransmissions?.[0] ?? null,
      );
      const { sunatTransmissions, ...rest } = sale as any;

      return {
        ...rest,
        date: sale.createdAt,
        serie: invoice?.serie ?? null,
        correlativo: invoice?.nroCorrelativo ?? null,
        tipoComprobante: invoice?.tipoComprobante ?? null,
        customerName: sale.client?.name ?? null,
        total: sale.total,
        sunatStatus,
        payments: sale.payments.map((p) => ({
          method: p.paymentMethod?.name,
          amount: p.amount,
        })),
        items: sale.salesDetails.map((detail) => ({
          qty: detail.quantity,
          unitPrice: detail.price,
          costUnit: detail.entryDetail.price,
          productName: detail.entryDetail.product.name,
          series: Array.isArray(detail.series)
            ? detail.series.filter(
                (value): value is string =>
                  typeof value === 'string' && value.length > 0,
              )
            : [],
        })),
      };
    });
  }

  private mapSaleWithSunatStatus<T extends { sunatTransmissions?: any[] }>(
    sale: T,
    options: { includeHistory: boolean },
  ) {
    const transmissions = sale.sunatTransmissions ?? [];
    const latest = transmissions[0] ?? null;
    const sunatStatus = this.extractSunatStatus(latest);

    if (options.includeHistory) {
      return {
        ...sale,
        sunatStatus,
      };
    }

    const { sunatTransmissions, ...rest } = sale as any;
    return {
      ...rest,
      sunatStatus,
    };
  }

  private extractSunatStatus(
    transmission?:
      | {
          id: number;
          status: string;
          ticket: string | null;
          environment?: string | null;
          errorMessage?: string | null;
          updatedAt?: Date;
          createdAt?: Date;
        }
      | null,
  ) {
    if (!transmission) {
      return null;
    }

    return {
      id: transmission.id,
      status: transmission.status,
      ticket: transmission.ticket ?? null,
      environment: transmission.environment ?? null,
      errorMessage: transmission.errorMessage ?? null,
      updatedAt: transmission.updatedAt ?? transmission.createdAt ?? null,
    };
  }
}





