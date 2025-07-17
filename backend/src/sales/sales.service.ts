import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { zonedTimeToUtc, utcToZonedTime, format as formatTz } from 'date-fns-tz'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { eachDayOfInterval } from 'date-fns';
import { InventoryService } from '../inventory/inventory.service';


@Injectable()
export class SalesService {

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  private async ensureCashRegister(storeId: number, userId: number) {
    let cashRegister = await this.prisma.cashRegister.findFirst({
      where: {
        storeId,
        status: 'ACTIVE',
      },
    });

    if (!cashRegister) {
      cashRegister = await this.prisma.cashRegister.create({
        data: {
          storeId,
          name: `Caja Principal - Tienda ${storeId} - ${Date.now()}`,
          initialBalance: 0,
          currentBalance: 0,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return cashRegister;
  }

  private async ensureStockInStore(
    storeId: number,
    productId: number,
    quantity: number,
    userId: number,
  ) {
    let destInventory = await this.prisma.storeOnInventory.findFirst({
      where: { storeId, inventory: { productId } },
    });

    const currentStock = destInventory?.stock ?? 0;
    if (currentStock >= quantity) {
      return;
    }

    const required = quantity - currentStock;
    const sourceInventory = await this.prisma.storeOnInventory.findFirst({
      where: {
        storeId: { not: storeId },
        inventory: { productId },
        stock: { gte: required },
      },
      orderBy: { stock: 'desc' },
    });

    if (!sourceInventory) {
      throw new BadRequestException(
        `Stock insuficiente para el producto con ID ${productId}.`,
      );
    }

    await this.inventoryService.transferProduct({
      sourceStoreId: sourceInventory.storeId,
      destinationStoreId: storeId,
      productId,
      quantity: required,
      userId,
      description: 'Auto transfer for online sale',
    });
  }

  private async processPayments(
    prisma: Prisma.TransactionClient,
    payments: { paymentMethodId: number; amount: number; currency: string }[],
    saleId: number,
    cashRegisterId: number,
    descriptionTransaction: string,
    userId: number,
  ) {
    for (const payment of payments) {
      if (payment.paymentMethodId === null || payment.paymentMethodId === undefined) {
        throw new BadRequestException('Debe proporcionar un paymentMethodId válido.');
      }

      let paymentMethod = await prisma.paymentMethod.findUnique({
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
          throw new BadRequestException(`Método de pago no válido: ${payment.paymentMethodId}`);
        }

        paymentMethod = await prisma.paymentMethod.findFirst({
          where: { name: methodName },
        });

        if (!paymentMethod) {
          paymentMethod = await prisma.paymentMethod.create({
            data: { name: methodName, isActive: true },
          });
        }

        const transaction = await prisma.cashTransaction.create({
          data: {
            cashRegisterId,
            type: 'INCOME',
            amount: new Prisma.Decimal(payment.amount),
            description: `Venta realizada. Pago vía ${paymentMethod.name}, ${descriptionTransaction}`,
            userId,
          },
        });

        await prisma.cashTransactionPaymentMethod.create({
          data: {
            cashTransactionId: transaction.id,
            paymentMethodId: paymentMethod.id,
          },
        });
      }

      await prisma.salePayment.create({
        data: {
          salesId: saleId,
          paymentMethodId: paymentMethod.id,
          amount: payment.amount,
          currency: payment.currency,
        },
      });
    }
  }

  private async createSaleDetails(
    prisma: Prisma.TransactionClient,
    saleId: number,
    details: { productId: number; quantity: number; price: number; series?: string[] }[],
    storeId: number,
    userId: number,
  ): Promise<string> {

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true },
    });
    const storeName = store?.name ?? 'Desconocido';
    let descriptionTransaction = 'Venta registrada: ';

    for (const detail of details) {
      const storeInventory = await prisma.storeOnInventory.findFirst({
        where: { storeId, inventory: { productId: detail.productId } },
      });

      if (!storeInventory) {
        throw new NotFoundException(
          `No se encontró inventario para el producto con ID ${detail.productId} en la tienda con ID ${storeId}.`,
        );
      }

      const product = await this.prisma.product.findUnique({
        where: { id: detail.productId },
      });

      if (!product) {
        throw new NotFoundException(`No se encontró el producto con ID ${detail.productId}.`);
      }

      descriptionTransaction += `${product.name} - Cantidad: ${detail.quantity}, Precio Unitario: ${detail.price}`;
      if (detail.series && detail.series.length > 0) {
        descriptionTransaction += `, Series: ${detail.series.join(', ')}`;
      }
      descriptionTransaction += '; ';

      const entryDetail = await prisma.entryDetail.findFirst({
        where: { productId: detail.productId },
      });

      if (!entryDetail) {
        throw new NotFoundException(
          `No se encontró un detalle de entrada para el producto con ID ${detail.productId}.`,
        );
      }

      await prisma.salesDetail.create({
        data: {
          salesId: saleId,
          entryDetailId: entryDetail.id,
          storeOnInventoryId: storeInventory.id,
          productId: detail.productId,
          quantity: detail.quantity,
          price: detail.price,
        },
      });

      if (detail.series && detail.series.length > 0) {
        for (const serial of detail.series) {
          const series = await prisma.entryDetailSeries.findFirst({
            where: {
              serial,
              entryDetail: {
                productId: detail.productId,
                entry: { storeId },
              },
            },
          });

          if (!series) {
            throw new NotFoundException(
              `La serie ${serial} no se encontró para el producto con ID ${detail.productId} en la tienda con ID ${storeId}.`,
            );
          }

          await prisma.entryDetailSeries.update({
            where: { id: series.id },
            data: { status: 'inactive' },
          });
        }
      }

      await prisma.storeOnInventory.update({
        where: { id: storeInventory.id },
        data: { stock: storeInventory.stock - detail.quantity },
      });

      await prisma.inventoryHistory.create({
        data: {
          inventoryId: storeInventory.inventoryId,
          userId,
          action: 'sales',
          description: `Venta realizada en la tienda ${storeName}`,
          stockChange: -detail.quantity,
          previousStock: storeInventory.stock,
          newStock: storeInventory.stock - detail.quantity,
        },
      });
    }

    return descriptionTransaction;
  }

  private async createInvoiceIfNeeded(
    prisma: Prisma.TransactionClient,
    saleId: number,
    total: number,
    tipoComprobante?: string,
    tipoMoneda?: string,
  ) {
    if (tipoComprobante && tipoComprobante !== 'SIN COMPROBANTE') {
      const serie = tipoComprobante === 'FACTURA' ? 'F001' : 'B001';
      const lastInvoice = await prisma.invoiceSales.findFirst({
        where: { tipoComprobante },
        orderBy: { nroCorrelativo: 'desc' },
      });

      const nuevoCorrelativo = lastInvoice ? parseInt(lastInvoice.nroCorrelativo) + 1 : 1;

      await prisma.invoiceSales.create({
        data: {
          salesId: saleId,
          serie,
          nroCorrelativo: nuevoCorrelativo.toString().padStart(3, '0'),
          tipoComprobante,
          tipoMoneda: tipoMoneda || 'PEN',
          total,
          fechaEmision: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }

  // Método para crear una venta
  async createSale(data: {
    userId: number;
    storeId: number;
    clientId?: number;
    total: number;
    description?: string;
    details: { productId: number; quantity: number; price: number; series?: string[] }[];
    tipoComprobante?: string; // Tipo de comprobante (factura, boleta, etc.)
    tipoMoneda: string;
    payments: { paymentMethodId: number; amount: number; currency: string }[];
    source?: 'POS' | 'WEB';
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
      source = 'POS',
    } = data;

    const cashRegister = await this.ensureCashRegister(storeId, userId);

    let clientIdToUse = clientId;

    if (!clientIdToUse) {

      let genericUser = await this.prisma.user.findFirst({ where: { username: 'generic_user' } });

      if (!genericUser) {
        genericUser = await this.prisma.user.create({
          data: {
            email: 'generic_user@example.com',
            username: 'generic_user',
            password: 'securepassword',
            role: 'CLIENT',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Buscar o crear el cliente "Sin Cliente"
      let genericClient = await this.prisma.client.findFirst({ where: { name: 'Sin Cliente' } });

      if (!genericClient) {
        genericClient = await this.prisma.client.create({
          data: {
            name: 'Sin Cliente',
            type: 'Sin Documento',
            status: 'Activo',
            user: { connect: { id: genericUser.id } },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      clientIdToUse = genericClient.id;
    }

    // Validar stock y calcular el total
    let total = 0;
    for (const detail of details) {
      await this.ensureStockInStore(storeId, detail.productId, detail.quantity, userId);

      const storeInventory = await this.prisma.storeOnInventory.findFirst({
        where: { storeId, inventory: { productId: detail.productId } },
      });

      if (!storeInventory || storeInventory.stock < detail.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para el producto con ID ${detail.productId} en la tienda ${storeId}.`
        );
      }

      total += detail.quantity * detail.price;
    }

    // Crear la venta y los detalles en una transacción
    return this.prisma.$transaction(async (prisma) => {
      // Crear la venta
      const sale = await prisma.sales.create({
        data: {
          userId,
          storeId,
          clientId: clientIdToUse, // Si no hay cliente, se guarda como null
          total,
          description,
          source,
        },
      });

      const descriptionTransaction = await this.createSaleDetails(
        prisma,
        sale.id,
        details,
        storeId,
        userId,
      );

      await this.processPayments(
        prisma,
        payments,
        sale.id,
        cashRegister.id,
        descriptionTransaction,
        userId,
      );
      
      await this.createInvoiceIfNeeded(prisma, sale.id, total, tipoComprobante, tipoMoneda);

      // Actualizar el saldo de la caja
      await this.prisma.cashRegister.update({
        where: { id: cashRegister.id },
        data: {
          currentBalance: cashRegister.currentBalance.add(total),
        },
      });

      return sale;
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
