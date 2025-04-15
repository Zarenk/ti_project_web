import { Injectable } from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InventoryService {
  [x: string]: any;
  constructor(private prisma: PrismaService){}

  // Listar todas las entradas
  async findAllInventoryHistory() {
    return this.prisma.inventoryHistory.findMany({
      include: {
        user: true, // Incluir información del usuario que realizó la acción
        inventory: {
          include: {
            product: true, // Incluir información del producto relacionado
            storeOnInventory: {
              include: {
                store: true, // Incluir información de la tienda asociada
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Ordenar por fecha de creación en orden descendente
      },
    });
  }
  //

  // Obtener el historial de un inventario específico por ID
  async findAllHistoryByUser(userId: number) {
    return this.prisma.inventoryHistory.findMany({
      where: { userId }, // Filtrar por el ID del usuario
      include: {
        user: true, // Incluir información del usuario
        inventory: {
          include: {
            product: true, // Incluir información del producto relacionado
            storeOnInventory: {
              include: {
                store: true, // Incluir información de la tienda asociada
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Ordenar por fecha de creación en orden descendente
      },
    });
  }
  //

  // Obtener el precio de compra de un producto 
  async getAllPurchasePrices() {
    const entryDetails = await this.prisma.entryDetail.groupBy({
      by: ['productId'],
      _max: {
        price: true, // Precio más alto
      },
      _min: {
        price: true, // Precio más bajo
      },
    });
  
    return entryDetails.map((entry) => ({
      productId: entry.productId,
      highestPurchasePrice: entry._max.price, // Precio más alto
      lowestPurchasePrice: entry._min.price, // Precio más bajo
    }));
  }
  //

  private async getInventoryId(productId: number): Promise<number> {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        productId,
      },
    });
  
    if (!inventory) {
      throw new Error(`No se encontró un inventario para el producto ${productId}`);
    }
  
    return inventory.id;
  }

  // Crear una nueva entrada de inventario TRASLADO
  async transferProduct(transferDto: {
    sourceStoreId: number;
    destinationStoreId: number;
    productId: number;
    quantity: number;
    description?: string;
    userId: number; // ID del usuario que realiza la transferencia
  }) {
    const { sourceStoreId, destinationStoreId, productId, quantity, description, userId } = transferDto;

    // Validar que la tienda de origen tenga suficiente stock
    const sourceStoreInventory = await this.prisma.storeOnInventory.findFirst({
      where: { storeId: sourceStoreId, inventory: { productId } },
    });

    if (!sourceStoreInventory || sourceStoreInventory.stock < quantity) {
      throw new Error('Stock insuficiente en la tienda de origen');
    }
    
    // Actualizar el stock en la tienda de origen
    await this.prisma.storeOnInventory.update({
      where: { id: sourceStoreInventory.id },
      data: { stock: sourceStoreInventory.stock - quantity },
    });

    // Actualizar el stock en la tienda de destino
    const destinationStoreInventory = await this.prisma.storeOnInventory.findFirst({
      where: { storeId: destinationStoreId, inventory: { productId } },
    });

    if (destinationStoreInventory) {
      // Si ya existe el producto en la tienda de destino, actualizar el stock
      await this.prisma.storeOnInventory.update({
        where: { id: destinationStoreInventory.id },
        data: { stock: destinationStoreInventory.stock + quantity },
      });
    } else {
      // Verificar si existe un registro en la tabla Inventory para el producto
      let inventory = await this.prisma.inventory.findFirst({
        where: { productId },
      });
    
      // Si no existe, crear un nuevo registro en Inventory
      if (!inventory) {
          inventory = await this.prisma.inventory.create({
            data: {
              productId,
              storeId: destinationStoreId, // Agregar el storeId requerido
            },
        });
      }
    
      // Crear un nuevo registro en StoreOnInventory
      await this.prisma.storeOnInventory.create({
        data: {
            storeId: destinationStoreId,
            inventoryId: inventory.id, // Proporcionar directamente el ID del inventario
            stock: quantity,
          },
      });
    }
    // Registrar el traslado
    try {
      await this.prisma.transfer.create({
        data: {
          sourceStoreId,
          destinationStoreId,
          productId,
          quantity,
          description: description || null,
        },
      });

      // Registrar el evento en el historial de movimientos
      await this.prisma.inventoryHistory.createMany({
        data: [
          {
            inventoryId: sourceStoreInventory.inventoryId,
            action: 'transfer-out', // Acción de salida
            stockChange: -quantity,
            previousStock: sourceStoreInventory.stock,
            newStock: sourceStoreInventory.stock - quantity,
            userId, // Usuario que realizó la acción
          },
          {
            inventoryId: destinationStoreInventory
            ? destinationStoreInventory.inventoryId
            : (await this.prisma.inventory.findFirst({ where: { productId } }))?.id ?? (() => {
                throw new Error(`No se encontró un inventoryId para el producto ${productId}`);
              })(),
            action: 'transfer-in', // Acción de entrada
            stockChange: quantity,
            previousStock: destinationStoreInventory ? destinationStoreInventory.stock : 0,
            newStock: destinationStoreInventory
              ? destinationStoreInventory.stock + quantity
              : quantity,
            userId, // Usuario que realizó la acción
          },
        ],
      });

    } catch (error) {
      console.error('Error al registrar el traslado:', error);
      throw new Error('No se pudo registrar el traslado en la tabla de transferencias');
    }
    return { message: 'Traslado realizado con éxito' };
  }
  //

  async getSeriesByProductAndStore(storeId: number, productId: number) {
    // Busca las series asociadas al producto en la tienda seleccionada
    const series = await this.prisma.entryDetailSeries.findMany({
      where: {
        entryDetail: {
          productId,
          entry: {
            storeId,
          },
        },
      },
      select: {
        serial: true, // Devuelve solo los números de serie
      },
    });
  
    return series.map((serie) => serie.serial); // Devuelve un array de números de serie
  }
}

