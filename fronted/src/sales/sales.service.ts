import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SalesService {

  constructor(private prisma: PrismaService){}

  async createSale(data: {
    userId: number;
    storeId: number;
    clientId?: number;
    total: number;
    description?: string;
    details: { productId: number; quantity: number; price: number }[];
  }) {
    const { userId, storeId, clientId, description, details } = data;

    // Validar que la tienda exista
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`La tienda con ID ${storeId} no existe.`);
    }

    // Obtener o crear el cliente genérico "Sin Cliente" si no se proporciona un clientId
    let finalClientId = clientId;
    if (!clientId) {
      // Buscar un usuario genérico asociado al cliente genérico
      let genericUser = await this.prisma.user.findFirst({
        where: { username: 'generic_user' },
      });

      // Si no existe, crear un usuario genérico
      if (!genericUser) {
        genericUser = await this.prisma.user.create({
          data: {
            email: 'generic_user@example.com',
            username: 'generic_user',
            password: 'securepassword', // Asegúrate de usar un hash en producción
            role: 'CLIENT',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // Buscar un cliente genérico asociado al usuario genérico
      const genericClient = await this.prisma.client.findFirst({
        where: { name: 'Sin Cliente' },
      });

      if (genericClient) {
        finalClientId = genericClient.id;
      } else {
        // Crear el cliente genérico
        const newGenericClient = await this.prisma.client.create({
          data: {
            name: 'Sin Cliente',
            type: 'Sin Documento',
            status: 'Activo',
            user: { connect: { id: genericUser.id } }, // Asociar al usuario genérico
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        finalClientId = newGenericClient.id;
      }
    }

    // Buscar un cliente genérico asociado al usuario genérico
    const genericClient = await this.prisma.client.findFirst({
      where: { name: 'Sin Cliente' },
    });

    // Validar que el cliente genérico exista
    if (!genericClient) {
      throw new NotFoundException('No se encontró el cliente genérico "Sin Cliente".');
    }

    const clientIdToUse = genericClient.id;

    // Validar stock y calcular el total
    let total = 0;
    for (const detail of details) {
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
        },
      });

      // Crear los detalles de la venta y actualizar el stock
      for (const detail of details) {
        const storeInventory = await prisma.storeOnInventory.findFirst({
          where: { storeId, inventory: { productId: detail.productId } },
        });

        // Validar que el inventario exista
        if (!storeInventory) {
          throw new NotFoundException(
            `No se encontró inventario para el producto con ID ${detail.productId} en la tienda con ID ${storeId}.`
          );
        }

        // Validar que el detalle de entrada exista
        const entryDetail = await prisma.entryDetail.findFirst({
          where: { productId: detail.productId },
        });

        if (!entryDetail) {
          throw new NotFoundException(
            `No se encontró un detalle de entrada para el producto con ID ${detail.productId}.`
          );
        }

        // Crear el detalle de la venta
        await prisma.salesDetail.create({
          data: {
            salesId: sale.id, // ID de la venta creada
            entryDetailId: entryDetail.id, // ID del detalle de entrada
            storeOnInventoryId: storeInventory.id, // ID del inventario de la tienda
            productId: detail.productId,
            quantity: detail.quantity,
            price: detail.price,
          },
        });

        // Actualizar el stock en la tienda
        await prisma.storeOnInventory.update({
          where: { id: storeInventory.id },
          data: { stock: storeInventory.stock - detail.quantity },
        });

        // Registrar el movimiento en el historial de inventario
        await prisma.inventoryHistory.create({
          data: {
            inventoryId: storeInventory.inventoryId,
            userId,
            action: 'sales',
            description: `Venta realizada en la tienda ${store.name}`,
            stockChange: -detail.quantity,
            previousStock: storeInventory.stock,
            newStock: storeInventory.stock - detail.quantity,
          },
        });
      }

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
}
