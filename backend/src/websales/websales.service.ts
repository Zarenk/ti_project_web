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
      source: 'WEB',
      getStoreName: ({ storeInventory }) => storeInventory.store.name,
      
    });
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
      },
    });

    if (!sale) {
      throw new NotFoundException(`No se encontró la venta con ID ${id}.`);
    }

    return sale;
  }
}