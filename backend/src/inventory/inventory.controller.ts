import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService, // Inyectar el servicio
  ) {}

  @Get()
  async getInventory() {
    return this.prisma.inventory.findMany({
      include: {
        product: {
          include: {
            category: true, // Incluir información de la categoría del producto
          },
        }, // Incluye información del producto
        storeOnInventory: {      // Incluye información de las tiendas
          include: {
            store: true,
          },
        },
      },
    });
  }

  @Get('/history/:inventoryId')
  async getInventoryHistory(@Param('inventoryId') inventoryId: string) {
    const id = parseInt(inventoryId, 10); // Convertir a número entero
    if (isNaN(id)) {
      throw new Error('El ID del inventario debe ser un número válido');
    }
    return this.prisma.inventoryHistory.findMany({
      where: { inventoryId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true, // Incluir información del usuario
      },
    });
  }

  @Get('/history')
  async findAllInventoryHistories() {
    return this.inventoryService.findAllInventoryHistory();
  }

  @Get('/history/users/:userId')
  async getHistoryByUser(@Param('userId') userId: string) {
    const id = parseInt(userId, 10); // Convertir a número entero
    if (isNaN(id)) {
      throw new Error('El ID del usuario debe ser un número válido');
    }
    return this.inventoryService.findAllHistoryByUser(id);
  }

  @Get('/purchase-prices')
  async getAllPurchasePrices() {
    const prices = await this.inventoryService.getAllPurchasePrices();
    return prices;
  }

  @Get('/stores-with-product/:productId')
  async getStoresWithProduct(@Param('productId') productId: string) {
  // Convertir el parámetro productId a un número
  const id = parseInt(productId, 10);

  // Validar que el ID sea un número válido
  if (isNaN(id)) {
    throw new Error('El ID del producto debe ser un número válido');
  }

  // Realizar la consulta con el ID convertido
  return this.prisma.storeOnInventory.findMany({
    where: { inventory: { productId: id } },
    include: { store: true },
  });
}

  @Get('/products-by-store/:storeId')
  async getProductsByStore(@Param('storeId') storeId: string) {
    const id = parseInt(storeId, 10); // Convertir el parámetro a número
    if (isNaN(id)) {
      throw new Error('El ID de la tienda debe ser un número válido');
    }

    return this.prisma.storeOnInventory.findMany({
      where: { storeId: id },
      include: {
        inventory: {
          include: {
            product: {
              include: {
                category: true, // Incluye información de la categoría del producto
              },
            },
          },
        },
      },
    });
  }

  @Get('/stock-by-product-and-store/:storeId/:productId')
  async getStockByProductAndStore(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    const storeIdNum = parseInt(storeId, 10);
    const productIdNum = parseInt(productId, 10);

    if (isNaN(storeIdNum) || isNaN(productIdNum)) {
      throw new Error('El ID de la tienda y el producto deben ser números válidos');
    }

    const stock = await this.prisma.storeOnInventory.findFirst({
      where: {
        storeId: storeIdNum,
        inventory: {
          productId: productIdNum,
        },
      },
      select: {
        stock: true,
      },
    });

    return stock ? stock.stock : 0; // Si no hay stock, devuelve 0
  }

  @Get('/series-by-product-and-store/:storeId/:productId')
  async getSeriesByProductAndStore(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    const storeIdNum = parseInt(storeId, 10);
    const productIdNum = parseInt(productId, 10);

    if (isNaN(storeIdNum) || isNaN(productIdNum)) {
      throw new Error('El ID de la tienda y el producto deben ser números válidos');
    }

    return this.inventoryService.getSeriesByProductAndStore(storeIdNum, productIdNum);
  }

  @Post('/transfer')
  async transferProduct(@Body() transferDto: {
    sourceStoreId: number;
    destinationStoreId: number;
    productId: number;
    quantity: number;
    description?: string;
    userId: number
  }) {
    return this.inventoryService.transferProduct(transferDto);
  }
}

