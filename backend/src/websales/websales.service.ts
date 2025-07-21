import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateWebSaleDto } from './dto/create-websale.dto';

@Injectable()
export class WebSalesService {
  constructor(private prisma: PrismaService) {}

  async createWebSale(data: CreateWebSaleDto) {
    const {
      userId,
      storeId = 1,
      clientId,
      description,
      details,
      payments,
      tipoComprobante,
      tipoMoneda,
    } = data;

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`La tienda con ID ${storeId} no existe.`);
    }

    let cashRegister = await this.prisma.cashRegister.findFirst({
      where: { storeId, status: 'ACTIVE' },
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

    if (!cashRegister) {
      throw new BadRequestException(`No hay una caja activa para la tienda con ID ${storeId}.`);
    }

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

    const allocations: { detail: typeof details[0]; storeInventory: any }[] = [];
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

    return this.prisma.$transaction(async (prisma) => {
      const sale = await prisma.sales.create({
        data: {
          userId,
          storeId,
          clientId: clientIdToUse,
          total,
          description,
          source: 'WEB',
        },
      });

      let descriptionTransaction = 'Venta registrada: ';

      for (const { detail, storeInventory } of allocations) {
        const product = await this.prisma.product.findUnique({ where: { id: detail.productId } });
        if (!product) {
          throw new NotFoundException(`No se encontró el producto con ID ${detail.productId}.`);
        }
        descriptionTransaction += `${product.name} - Cantidad: ${detail.quantity}, Precio Unitario: ${detail.price}`;
        if (detail.series && detail.series.length > 0) {
          descriptionTransaction += `, Series: ${detail.series.join(', ')}`;
        }
        descriptionTransaction += '; ';

        const entryDetail = await prisma.entryDetail.findFirst({ where: { productId: detail.productId } });
        if (!entryDetail) {
          throw new NotFoundException(`No se encontró un detalle de entrada para el producto con ID ${detail.productId}.`);
        }

        await prisma.salesDetail.create({
          data: {
            salesId: sale.id,
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
                  entry: { storeId: storeInventory.storeId },
                },
              },
            });
            if (!series) {
              throw new NotFoundException(
                `La serie ${serial} no se encontró para el producto con ID ${detail.productId} en la tienda con ID ${storeInventory.storeId}.`,
              );
            }
            await prisma.entryDetailSeries.update({ where: { id: series.id }, data: { status: 'inactive' } });
          }
        }

        for (const payment of payments) {
          if (payment.paymentMethodId === null || payment.paymentMethodId === undefined) {
            throw new BadRequestException('Debe proporcionar un paymentMethodId válido.');
          }

          let paymentMethod = await prisma.paymentMethod.findUnique({ where: { id: payment.paymentMethodId } });
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
            paymentMethod = await prisma.paymentMethod.findFirst({ where: { name: methodName } });
            if (!paymentMethod) {
              paymentMethod = await prisma.paymentMethod.create({ data: { name: methodName, isActive: true } });
            }
            const transaction = await prisma.cashTransaction.create({
              data: {
                cashRegisterId: cashRegister.id,
                type: 'INCOME',
                amount: new Prisma.Decimal(payment.amount),
                description: `Venta realizada. Pago vía ${paymentMethod.name}, ${descriptionTransaction}`,
                userId,
              },
            });
            await prisma.cashTransactionPaymentMethod.create({
              data: { cashTransactionId: transaction.id, paymentMethodId: paymentMethod.id },
            });
          }
          await prisma.salePayment.create({
            data: {
              salesId: sale.id,
              paymentMethodId: paymentMethod.id,
              amount: payment.amount,
              currency: payment.currency,
            },
          });
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
            description: `Venta realizada en la tienda ${storeInventory.store.name}`,
            stockChange: -detail.quantity,
            previousStock: storeInventory.stock,
            newStock: storeInventory.stock - detail.quantity,
          },
        });
      }

      if (tipoComprobante && tipoComprobante !== 'SIN COMPROBANTE') {
        const serie = tipoComprobante === 'FACTURA' ? 'F001' : 'B001';
        const lastInvoice = await prisma.invoiceSales.findFirst({
          where: { tipoComprobante },
          orderBy: { nroCorrelativo: 'desc' },
        });
        const nuevoCorrelativo = lastInvoice ? parseInt(lastInvoice.nroCorrelativo) + 1 : 1;
        await prisma.invoiceSales.create({
          data: {
            salesId: sale.id,
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

      await this.prisma.cashRegister.update({
        where: { id: cashRegister.id },
        data: { currentBalance: cashRegister.currentBalance.add(total) },
      });

      return sale;
    });
  }
}