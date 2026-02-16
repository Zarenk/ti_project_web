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
  UseGuards,
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
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class InventoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService, // Inyectar el servicio
  ) {}

  // Endpoint para crear un nuevo inventario
  @Get()
  async getInventory(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.inventoryService.getInventoryWithEntries(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // Endpoint para obtener moneda y stock por tienda
  @Get('/with-currency')
  async getInventoryWithCurrency(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.inventoryService.calculateInventoryWithCurrencyByStore(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // Endpoint para obtener el stock de productos por tienda y moneda
  @Get('/stock-details-by-store-and-currency')
  async getStockDetailsByStoreAndCurrency(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.inventoryService.getStockDetailsByStoreAndCurrency(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // Endpoint para obtener el historial de un inventario específico
  @Get('/history/:inventoryId')
  async getInventoryHistory(
    @Param('inventoryId') inventoryId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const id = parseInt(inventoryId, 10); // Convertir a número entero
    if (isNaN(id)) {
      throw new Error('El ID del inventario debe ser un número válido');
    }
    return this.prisma.inventoryHistory.findMany({
      where: {
        inventoryId: id,
        ...(organizationId !== null && organizationId !== undefined
          ? { organizationId }
          : {}),
        ...(companyId !== null && companyId !== undefined ? { companyId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true, // Incluir información del usuario
      },
    });
  }

  // Endpoint para obtener el historial de inventario completo
  @Get('/history')
  async findAllInventoryHistories(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.inventoryService.findAllInventoryHistory(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // Endpoint para obtener el historial de un usuario específico
  @Get('/history/users/:userId')
  async getHistoryByUser(
    @Param('userId') userId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const id = parseInt(userId, 10); // Convertir a número entero
    if (isNaN(id)) {
      throw new Error('El ID del usuario debe ser un número válido');
    }
    return this.inventoryService.findAllHistoryByUser(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // Endpoint para obtener el historial de un producto específico
  @Get('/purchase-prices')
  async getAllPurchasePrices(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const prices = await this.inventoryService.getAllPurchasePrices(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
    return prices;
  }

  // Endpoint para obtener las tiendas que tienen un producto específico
  @Get('/stores-with-product/:productId')
  async getStoresWithProduct(
    @Param('productId') productId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.inventoryService.getStoresWithProduct(
      Number(productId),
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }


  @Get('/product-entries/:productId')
  async getProductEntries(
    @Param('productId') productId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const id = Number(productId);
    if (!Number.isFinite(id)) {
      throw new BadRequestException('El ID del producto debe ser un numero valido');
    }
    return this.inventoryService.getProductEntries(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('/series-by-product-and-store/:storeId/:productId')
  async getSeriesByProductAndStore(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const storeIdValue = Number(storeId);
    const productIdValue = Number(productId);
    if (!Number.isFinite(storeIdValue) || !Number.isFinite(productIdValue)) {
      throw new BadRequestException('Los IDs deben ser numeros validos');
    }
    return this.inventoryService.getSeriesByProductAndStore(
      storeIdValue,
      productIdValue,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('/product-by-inventory/:inventoryId')
  async getProductByInventoryId(
    @Param('inventoryId') inventoryId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const id = Number(inventoryId);
    if (!Number.isFinite(id)) {
      throw new BadRequestException('El ID del inventario debe ser un numero valido');
    }
    return this.inventoryService.getProductByInventoryId(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('/product-sales/:productId')
  async getProductSales(
    @Param('productId') productId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const id = Number(productId);
    if (!Number.isFinite(id)) {
      throw new BadRequestException('El ID del producto debe ser un numero valido');
    }
    return this.inventoryService.getProductSales(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('/stock-by-product-and-store/:storeId/:productId')
  async getStockByProductAndStore(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const storeIdValue = Number(storeId);
    const productIdValue = Number(productId);
    if (!Number.isFinite(storeIdValue) || !Number.isFinite(productIdValue)) {
      throw new BadRequestException('Los IDs deben ser numeros validos');
    }
    return this.inventoryService.getStockByProductAndStore(
      storeIdValue,
      productIdValue,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }


  @Get('/products-by-store/:storeId')
  async getProductsByStore(
    @Param('storeId') storeId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    const id = Number(storeId);
    if (!Number.isFinite(id)) {
      throw new BadRequestException('El ID de la tienda debe ser un numero valido');
    }
    return this.inventoryService.getProductsByStore(
      id,
      categoryId ? Number(categoryId) : undefined,
      search,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('/all-products-by-store/:storeId')
  async getAllProductsByStore(
    @Param('storeId') storeId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('categoryId') categoryId?: string,
  ) {
    const id = Number(storeId);
    if (!Number.isFinite(id)) {
      throw new BadRequestException('El ID de la tienda debe ser un numero valido');
    }
    return this.inventoryService.getAllProductsByStore(
      id,
      categoryId ? Number(categoryId) : undefined,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }
}
