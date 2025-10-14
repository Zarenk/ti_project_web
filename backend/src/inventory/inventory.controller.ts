import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  Query,
  UseInterceptors,
  UploadedFile,
  Header,
  Res,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { format } from 'date-fns';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService, // Inyectar el servicio
  ) {}

  // Endpoint para crear un nuevo inventario
  @Get()
  async getInventory() {
    return this.prisma.inventory.findMany({
      include: {
        product: {
          include: {
            category: true, // Incluir información de la categoría del producto
          },
        }, // Incluye información del producto
        entryDetails: {
          include: {
            entry: true, // Incluye información de la entrada
            series: true, // Incluir series disponibles
          },
        },
        storeOnInventory: {      // Incluye información de las tiendas
          include: {
            store: true,
          },
        },
      },
    });
  }

  // Endpoint para obtener moneda y stock por tienda
  @Get('/with-currency')
  async getInventoryWithCurrency() {
    return this.inventoryService.calculateInventoryWithCurrencyByStore();
  }

  // Endpoint para obtener el stock de productos por tienda y moneda
  @Get('/stock-details-by-store-and-currency')
  async getStockDetailsByStoreAndCurrency() {
    return this.inventoryService.getStockDetailsByStoreAndCurrency();
  }

  // Endpoint para obtener el historial de un inventario específico
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

  // Endpoint para obtener el historial de inventario completo
  @Get('/history')
  async findAllInventoryHistories() {
    return this.inventoryService.findAllInventoryHistory();
  }

  // Endpoint para obtener el historial de un usuario específico
  @Get('/history/users/:userId')
  async getHistoryByUser(@Param('userId') userId: string) {
    const id = parseInt(userId, 10); // Convertir a número entero
    if (isNaN(id)) {
      throw new Error('El ID del usuario debe ser un número válido');
    }
    return this.inventoryService.findAllHistoryByUser(id);
  }

  // Endpoint para obtener el historial de un producto específico
  @Get('/purchase-prices')
  async getAllPurchasePrices() {
    const prices = await this.inventoryService.getAllPurchasePrices();
    return prices;
  }

  // Endpoint para obtener las tiendas que tienen un producto específico
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

  // Endpoint para obtener el inventario de todos los productos por tienda con stock
  @Get('/products-by-store/:storeId')
  async getProductsByStore(
    @Param('storeId') storeId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const id = parseInt(storeId, 10);
    if (isNaN(id)) {
      throw new BadRequestException(
        'El ID de la tienda debe ser un número válido',
      );
    }

    return this.inventoryService.getProductsByStore(
      id,
      categoryId ? parseInt(categoryId, 10) : undefined,
    );
  }

  // Endpoint para obtener el inventario de todos los productos por tienda sin stock
  @Get('/all-products-by-store/:storeId')
  async getAllProductsByStore(
    @Param('storeId') storeId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const id = parseInt(storeId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('El ID de la tienda debe ser un número válido');
    }

    return this.inventoryService.getAllProductsByStore(id, categoryId ? parseInt(categoryId, 10) : undefined);
  }

  // Endpoint para obtener el stock de un producto específico en una tienda específica
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

  // Endpoint para obtener las series de un producto específico en una tienda específica
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

  // Endpoint para obtener las entradas de un producto específico
  @Get('/product-entries/:productId')
  async getProductEntries(@Param('productId') productId: string) {
    const id = parseInt(productId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('El ID del producto no es válido');
    }

    return this.inventoryService.getProductEntries(id);
  }

  // Endpoint para obtener el producto por ID de tienda en inventario
  @Get('/product-by-inventory/:inventoryId')
  async getProductByInventoryId(@Param('inventoryId') inventoryId: number) {
    if (isNaN(inventoryId)) {
      throw new BadRequestException('El ID de inventario debe ser un número válido');
    }

    return this.inventoryService.getProductByInventoryId(inventoryId);
  }

  // Endpoint para obtener las salidas de un producto específico
  @Get('/product-sales/:productId')
  async getProductSales(@Param('productId') productId: string) {
    const id = parseInt(productId, 10);
    if (isNaN(id)) {
      throw new BadRequestException('El ID del producto no es válido');
    }

    return this.inventoryService.getProductSales(id);
  }

  // Endpoint para obtener las categorias de productos desde el inventario
  @Get('categories')
  async getCategoriesFromInventory() {
    return this.inventoryService.getCategoriesFromInventory();
  }

  // Endpoint para obtener el total del inventario por nombre de producto
  @Get('/total-inventory')
  async getTotalInventory() {
    return this.inventoryService.getTotalInventoryByName();
  }

  // Endpoint para obtener los items en general sin stock
  @Get('/low-stock-items')
  async getLowStockItems() {
    return this.inventoryService.getProductsWithLowStockAcrossStores();
  }
  
  // Endpoint Transferencia de productos entre tiendas
  @Post('/transfer')
  async transferProduct(
    @Body()
    transferDto: {
      sourceStoreId: number;
      destinationStoreId: number;
      productId: number;
      quantity: number;
      description?: string;
      userId: number;
      organizationId?: number | null;
    },
  ) {
    return this.inventoryService.transferProduct(transferDto);
  }

  @Post('import-excel')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'excels'),
        filename: (req, file, cb) => {
          const randomName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    const data = this.inventoryService.parseExcel(file.path);

    return {
      message: 'Archivo procesado con éxito',
      preview: data,
    };
  }

  @Post('import-excel/commit')
  async commitExcelImport(
    @Body()
    body: {
      storeId: number;
      userId: number;
      providerId: number | null;
      data: any[];
      organizationId?: number | null;
    },
  ) {
    return this.inventoryService.processExcelData(
      body.data,
      body.storeId,
      body.userId,
      body.providerId,
      body.organizationId,
    );
  }

  @Get('export/:storeId')
  async exportInventory(
    @Param('storeId') storeId: number,
    @Query('categoryId') categoryId: number,
    @Res() res: Response,
  ) {

    const store = await this.prisma.store.findUnique({
      where: { id: Number(storeId) },
    });

    if (!store) {
      res.status(404).send('Tienda no encontrada');
      return;
    }

    // Limpia el nombre para usarlo en el nombre del archivo
    const storeSlug = store.name.replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
    const date = format(new Date(), 'yyyyMMdd');
    const fileName = `inventario-${storeSlug}-${date}.xlsx`;

    const buffer = await this.inventoryService.generateInventoryExcel(storeId, categoryId, store.name);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(buffer);
  }

}

