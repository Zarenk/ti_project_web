import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { zonedTimeToUtc, utcToZonedTime, format as formatTz } from 'date-fns-tz'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { eachDayOfInterval } from 'date-fns';
import { executeSale, prepareSaleContext, SaleAllocation } from 'src/utils/sales-helper';

@Injectable()
export class SalesService {

  constructor(private prisma: PrismaService){}

  // Método para crear una venta
  async createSale(data: {
    userId: number;
    storeId: number;
    clientId?: number;
    total: number;
    description?: string;
    details: { productId: number; quantity: number; price: number; series?: string[] }[];
    tipoComprobante?: string;
    tipoMoneda: string;
    payments: { paymentMethodId: number; amount: number; currency: string }[];
  }) {
    const { userId, storeId, clientId, description, details, payments, tipoComprobante, tipoMoneda } = data;

    const { store, cashRegister, clientIdToUse } = await prepareSaleContext(this.prisma, storeId, clientId);

    // Validar stock, calcular el total y preparar las asignaciones de inventario
    const allocations: SaleAllocation[] = [];
    let total = 0;
    for (const detail of details) {
      const storeInventory = await this.prisma.storeOnInventory.findFirst({
        where: { storeId, inventory: { productId: detail.productId } },
      });

      if (!storeInventory || storeInventory.stock < detail.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto con ID ${detail.productId} en la tienda ${storeId}.`,
        );
      }

      allocations.push({ detail, storeInventory });
      total += detail.quantity * detail.price;
    }

    return executeSale(this.prisma, {
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
    });
  }

  async findAllSales() {
    return this.prisma.sales.findMany({
      include: {
        user: true,
        store: true,
        client: true,
        salesDetails: {
          include: {
            entryDetail: {
              include: {
                product: true, // Incluir el producto a través de EntryDetail
              },
            },
            storeOnInventory: {
              include: {
                inventory: {
                  include: {
                    product: true, // Incluir el producto a través de StoreOnInventory
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const sale = await this.prisma.sales.findUnique({
      where: { id },
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
      },
    });

    if (!sale) {
      throw new NotFoundException(`No se encontró la venta con ID ${id}.`);
    }

    return sale;
  }

  // Método para obtener las series vendidas en una venta específica
  async getSoldSeriesBySale(saleId: number) {
    // Buscar la venta con los detalles y las series asociadas
    const sale = await this.prisma.sales.findUnique({
      where: { id: saleId },
      include: {
        salesDetails: {
          include: {
            entryDetail: {
              include: {
                product: true, // Incluir el producto a través de EntryDetail
                series: true,  // Incluir las series asociadas al detalle de entrada
              },
            },
          },
        },
      },
    });
  
    if (!sale) {
      throw new NotFoundException(`No se encontró la venta con ID ${saleId}.`);
    }
  
    // Formatear los datos para devolver solo las series vendidas
    const soldSeries = sale.salesDetails.map((detail) => ({
      productId: detail.entryDetail.product.id, // Acceder al producto a través de EntryDetail
      productName: detail.entryDetail.product.name,
      series: detail.entryDetail.series.map((serie) => ({
        serial: serie.serial,
        status: serie.status,
      })),
    }));
  
    return {
      saleId: sale.id,
      soldSeries,
    };
  }

  async getMonthlySalesTotal() {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(startOfCurrentMonth.getTime() - 1); // 1 día antes del inicio del mes actual
  
    const [currentMonth, previousMonth] = await Promise.all([
      this.prisma.sales.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: startOfCurrentMonth, lte: now } },
      }),
      this.prisma.sales.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } },
      }),
    ]);
  
    const totalCurrent = currentMonth._sum.total || 0;
    const totalPrevious = previousMonth._sum.total || 0;
  
    const growthPercentage = totalPrevious > 0
      ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
      : null;
  
    return {
      total: totalCurrent,
      growth: growthPercentage, // puede ser null si no hubo ventas el mes pasado
    };
  }
  
  async getRevenueByCategory(startDate?: Date, endDate?: Date) {
    const timeZone = 'America/Lima';
    const filters: any = {};
  
    if (startDate && endDate) {
      filters.createdAt = {
        gte: zonedTimeToUtc(startDate, timeZone),
        lte: zonedTimeToUtc(endDate, timeZone),
      };
    }
  
    const sales = await this.prisma.sales.findMany({
      where: filters,
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
      const categoryName = product?.category?.name || 'Sin categoría';
      const revenue = (detail.quantity || 0) * (detail.price || 0);
      revenueByCategory[categoryName] = (revenueByCategory[categoryName] || 0) + revenue;
    }
  
    return Object.entries(revenueByCategory).map(([name, value]) => ({ name, value }));
  }

  async getDailySalesByDateRange(from: Date, to: Date) {
    const timeZone = 'America/Lima';
  
    const zonedFrom = zonedTimeToUtc(new Date(from), timeZone);
    const zonedTo = zonedTimeToUtc(new Date(to), timeZone);
  
    const sales = await this.prisma.sales.findMany({
      where: {
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
      const dateKey = formatTz(utcToZonedTime(date, timeZone), 'yyyy-MM-dd', { timeZone });
      return {
        date: dateKey,
        sales: salesByDate[dateKey] || 0,
      };
    });
  
    return result;
  }

  async getTopProducts(limit = 10, startDate?: string, endDate?: string) {
    const filters: any = {};
    const timeZone = 'America/Lima';
  
    if (startDate && endDate) {
      const zonedFrom = zonedTimeToUtc(new Date(startDate), timeZone);
      const zonedTo = zonedTimeToUtc(new Date(endDate), timeZone);
  
      const salesInRange = await this.prisma.sales.findMany({
        where: {
          createdAt: {
            gte: zonedFrom,
            lte: zonedTo,
          },
        },
        select: { id: true },
      });
  
      const salesIds = salesInRange.map(s => s.id);
      filters.salesId = { in: salesIds };
    }
  
    const details = await this.prisma.salesDetail.findMany({
      where: filters,
    });
  
    const salesMap: Record<number, number> = {};
    for (const detail of details) {
      if (!salesMap[detail.productId]) {
        salesMap[detail.productId] = 0;
      }
      salesMap[detail.productId] += detail.quantity;
    }
  
    const sorted = Object.entries(salesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  
    const productIds = sorted.map(([productId]) => Number(productId));
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });
  
    return sorted.map(([productId, totalSales]) => {
      const product = products.find(p => p.id === Number(productId));
      return {
        name: product?.name || "Producto desconocido",
        sales: totalSales,
      };
    });
  }

  async getMonthlySalesCount() {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(startOfCurrentMonth.getTime() - 1);
  
    const [currentCount, previousCount] = await Promise.all([
      this.prisma.sales.count({
        where: { createdAt: { gte: startOfCurrentMonth, lte: now } },
      }),
      this.prisma.sales.count({
        where: { createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } },
      }),
    ]);
  
    const growth = previousCount > 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : null;
  
    return {
      count: currentCount,
      growth,
    };
  }

  async getMonthlyClientStats() {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(startOfCurrentMonth.getTime() - 1);
  
    const [currentClients, previousClients] = await Promise.all([
      this.prisma.sales.findMany({
        where: {
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
  
    const growth = previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : null;
  
    return {
      total: currentTotal,
      growth,
    };
  }

  async getRecentSales(from?: string, to?: string, limit: number = 10) {
    const timeZone = 'America/Lima';
  
    const whereClause = from && to
      ? {
          createdAt: {
            gte: zonedTimeToUtc(new Date(from), timeZone),
            lte: zonedTimeToUtc(endOfDay(new Date(to)), timeZone), // 👈 Asegura fin del día
          },
        }
      : undefined;
  
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
        total: sale.total,
        createdAt: sale.createdAt,
        products: sale.salesDetails.map((detail) => ({
          name: detail.entryDetail.product.name,
          quantity: detail.quantity,
          price: detail.price,
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

}
