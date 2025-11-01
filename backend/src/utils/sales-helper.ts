import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export interface SaleDetail {
  productId: number;
  quantity: number;
  price: number;
  series?: string[];
}

export interface SaleAllocation {
  detail: SaleDetail;
  storeInventory: any;
}

export async function prepareSaleContext(
  prisma: PrismaService,
  storeId: number,
  clientId?: number,
) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      organizationId: true,
      companyId: true,
    },
  });
  if (!store) {
    throw new NotFoundException(`La tienda con ID ${storeId} no existe.`);
  }

  let cashRegister = await prisma.cashRegister.findFirst({
    where: { storeId, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      currentBalance: true,
      initialBalance: true,
      status: true,
      organizationId: true,
      storeId: true,
    },
  });

  if (!cashRegister) {
    cashRegister = await prisma.cashRegister.create({
      data: {
        storeId,
        name: `Caja Principal - Tienda ${storeId} - ${Date.now()}`,
        initialBalance: new Prisma.Decimal(0),
        currentBalance: new Prisma.Decimal(0),
        status: 'ACTIVE',
        organizationId: store.organizationId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } else if (
    store.organizationId !== undefined &&
    cashRegister.organizationId !== store.organizationId
  ) {
    cashRegister = await prisma.cashRegister.update({
      where: { id: cashRegister.id },
      data: { organizationId: store.organizationId ?? null },
    });
  }

  if (!cashRegister) {
    throw new BadRequestException(
      `No hay una caja activa para la tienda con ID ${storeId}.`,
    );
  }

  let clientIdToUse = clientId;
  if (!clientIdToUse) {
    let genericUser = await prisma.user.findFirst({
      where: { username: 'generic_user' },
    });
    if (!genericUser) {
      genericUser = await prisma.user.create({
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

    let genericClient = await prisma.client.findFirst({
      where: { name: 'Sin Cliente' },
    });
    if (!genericClient) {
      genericClient = await prisma.client.create({
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

  return { store, cashRegister, clientIdToUse };
}

export async function executeSale(
  prisma: PrismaService,
  params: {
    userId: number;
    storeId: number;
    clientId: number;
    description?: string;
    allocations: SaleAllocation[];
    payments: {
      paymentMethodId: number;
      amount: number;
      currency: string;
      transactionId?: string;
    }[];
    tipoComprobante?: string;
    tipoMoneda: string;
    cashRegister: any;
    total: number;
    source: 'POS' | 'WEB';
    getStoreName: (alloc: SaleAllocation) => string;
    onSalePosted?: (saleId: number, postedAt: Date) => Promise<void> | void;
    organizationId?: number | null;
    companyId?: number | null;
  },
) {
  const {
    userId,
    storeId,
    clientId,
    description,
    allocations,
    payments,
    tipoComprobante,
    tipoMoneda,
    cashRegister,
    total,
    source,
    getStoreName,
    onSalePosted,
    organizationId,
    companyId,
  } = params;

  const saleOrganizationId = organizationId ?? null;

  const sale = await prisma.$transaction(async (prismaTx) => {
    const sale = await prismaTx.sales.create({
      data: {
        userId,
        storeId,
        clientId,
        total,
        description,
        source,
        organizationId: organizationId ?? null,
        companyId: companyId ?? null,
      },
    });

    let descriptionTransaction = 'Venta registrada: ';

    const client = await prismaTx.client.findUnique({
      where: { id: clientId },
      select: {
        name: true,
        type: true,
        typeNumber: true,
      },
    });

    for (const { detail, storeInventory } of allocations) {
      const product = await prisma.product.findUnique({
        where: { id: detail.productId },
      });
      if (!product) {
        throw new NotFoundException(
          `No se encontró el producto con ID ${detail.productId}.`,
        );
      }

      descriptionTransaction += `${product.name} - Cantidad: ${detail.quantity}, Precio Unitario: ${detail.price}`;
      if (detail.series && detail.series.length > 0) {
        descriptionTransaction += `, Series: ${detail.series.join(', ')}`;
      }
      descriptionTransaction += '; ';

      const entryDetail = await prismaTx.entryDetail.findFirst({
        where: {
          productId: detail.productId,
          entry: { storeId: storeInventory.storeId },
        },
      });
      if (!entryDetail) {
        throw new NotFoundException(
          `No se encontró un detalle de entrada para el producto con ID ${detail.productId} en la tienda ${storeInventory.storeId}.`,
        );
      }

      await prismaTx.salesDetail.create({
        data: {
          salesId: sale.id,
          entryDetailId: entryDetail.id,
          storeOnInventoryId: storeInventory.id,
          productId: detail.productId,
          quantity: detail.quantity,
          price: detail.price,
          series: detail.series ?? [],
        },
      });

      if (detail.series && detail.series.length > 0) {
        for (const serial of detail.series) {
          const series = await prismaTx.entryDetailSeries.findFirst({
            where: {
              serial,
              organizationId: saleOrganizationId,
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
          await prismaTx.entryDetailSeries.update({
            where: { id: series.id },
            data: { status: 'inactive' },
          });
        }
      }

      for (const payment of payments) {
        if (
          payment.paymentMethodId === null ||
          payment.paymentMethodId === undefined
        ) {
          throw new BadRequestException(
            'Debe proporcionar un paymentMethodId válido.',
          );
        }

        let paymentMethod = await prismaTx.paymentMethod.findUnique({
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
              `Método de pago no válido: ${payment.paymentMethodId}`,
            );
          }
          paymentMethod = await prismaTx.paymentMethod.findFirst({
            where: { name: methodName },
          });
          if (!paymentMethod) {
            paymentMethod = await prismaTx.paymentMethod.create({
              data: { name: methodName, isActive: true },
            });
          }
        }

        const transaction = await prismaTx.cashTransaction.create({
          data: {
            cashRegisterId: cashRegister.id,
            type: 'INCOME',
            amount: new Prisma.Decimal(payment.amount),
            description: `Venta realizada. Pago vía ${paymentMethod.name}, ${descriptionTransaction}`,
            userId,
            clientName: client?.name ?? null,
            clientDocument: client?.typeNumber ?? null,
            clientDocumentType: client?.type ?? null,
            organizationId: saleOrganizationId,
          },
        });

        await prismaTx.cashTransactionPaymentMethod.create({
          data: {
            cashTransactionId: transaction.id,
            paymentMethodId: paymentMethod.id,
          },
        });

        await prismaTx.salePayment.create({
          data: {
            salesId: sale.id,
            paymentMethodId: paymentMethod.id,
            amount: payment.amount,
            currency: payment.currency,
            transactionId: payment.transactionId,
            cashTransactionId: transaction.id,
          },
        });
      }

      await prismaTx.storeOnInventory.update({
        where: { id: storeInventory.id },
        data: { stock: storeInventory.stock - detail.quantity },
      });

      await prismaTx.inventoryHistory.create({
        data: {
          inventoryId: storeInventory.inventoryId,
          userId,
          action: 'sales',
          description: `Venta realizada en la tienda ${getStoreName({ detail, storeInventory })}`,
          stockChange: -detail.quantity,
          previousStock: storeInventory.stock,
          newStock: storeInventory.stock - detail.quantity,
          organizationId: organizationId ?? null,
          companyId: companyId ?? null,
        },
      });
    }

    if (tipoComprobante && tipoComprobante !== 'SIN COMPROBANTE') {
      const serie = tipoComprobante === 'FACTURA' ? 'F001' : 'B001';
      const lastInvoice = await prismaTx.invoiceSales.findFirst({
        where: { tipoComprobante },
        orderBy: { nroCorrelativo: 'desc' },
      });
      const nuevoCorrelativo = lastInvoice
        ? parseInt(lastInvoice.nroCorrelativo) + 1
        : 1;
      await prismaTx.invoiceSales.create({
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

    await prisma.cashRegister.update({
      where: { id: cashRegister.id },
      data: { currentBalance: cashRegister.currentBalance.add(total) },
    });

    return sale;
  });

  if (onSalePosted) {
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await onSalePosted(sale.id, new Date());
        break;
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          console.warn(`Failed to notify accounting, attempt ${attempt}`, err);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.error('Failed to notify accounting after retries', err);
        }
      }
    }
  }

  return sale;
}
