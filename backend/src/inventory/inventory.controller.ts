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
  Logger,
  SetMetadata,
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
import { InventorySnapshotService } from './inventory-snapshot.service';
import { HistoricalSnapshotService } from './historical-snapshot.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly snapshotService: InventorySnapshotService,
    private readonly historicalSnapshotService: HistoricalSnapshotService,
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

  // ==================== INVENTORY SNAPSHOTS ====================

  /**
   * Crear snapshot del mes actual manualmente
   * POST /inventory/snapshots/current
   */
  @Post('/snapshots/current')
  async createCurrentSnapshot(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.snapshotService.createCurrentMonthSnapshot(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  /**
   * Crear snapshot para un mes/año específico
   * POST /inventory/snapshots
   * Body: { month: number, year: number }
   */
  @Post('/snapshots')
  async createSnapshot(
    @Body() body: { month: number; year: number },
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const { month, year } = body;
    if (!month || !year || month < 1 || month > 12 || year < 2000) {
      throw new BadRequestException('Mes y año inválidos');
    }
    return this.snapshotService.createSnapshot(
      month,
      year,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  /**
   * Obtener snapshots históricos
   * GET /inventory/snapshots?limit=12
   */
  @Get('/snapshots')
  async getSnapshots(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? Number(limit) : 12;
    return this.snapshotService.getSnapshots(
      organizationId ?? undefined,
      companyId ?? undefined,
      limitNum,
    );
  }

  /**
   * Obtener snapshot específico de un mes/año
   * GET /inventory/snapshots/:year/:month
   */
  @Get('/snapshots/:year/:month')
  async getSnapshot(
    @Param('year') year: string,
    @Param('month') month: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const yearNum = Number(year);
    const monthNum = Number(month);
    if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) {
      throw new BadRequestException('Año y mes deben ser números válidos');
    }
    if (monthNum < 1 || monthNum > 12 || yearNum < 2000) {
      throw new BadRequestException('Mes y año inválidos');
    }
    return this.snapshotService.getSnapshot(
      monthNum,
      yearNum,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // ==================== HISTORICAL SNAPSHOTS (BACKFILL) ====================

  /**
   * Obtener rango de datos disponibles (primera entrada y última venta)
   * GET /inventory/snapshots/data-range
   */
  @Get('/snapshots/data-range')
  async getDataRange(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.historicalSnapshotService.getDataRange(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  /**
   * Crear snapshot calculado retroactivamente para un mes específico
   * POST /inventory/snapshots/calculate
   * Body: { month: number, year: number }
   */
  @Post('/snapshots/calculate')
  async calculateSnapshot(
    @Body() body: { month: number; year: number },
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const { month, year } = body;
    if (!month || !year || month < 1 || month > 12 || year < 2000) {
      throw new BadRequestException('Mes y año inválidos');
    }
    return this.historicalSnapshotService.createCalculatedSnapshot(
      month,
      year,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  /**
   * Backfill: crear snapshots calculados para un rango de meses
   * POST /inventory/snapshots/backfill
   * Body: { startMonth: number, startYear: number, endMonth: number, endYear: number }
   */
  @Post('/snapshots/backfill')
  async backfillSnapshots(
    @Body()
    body: {
      startMonth: number;
      startYear: number;
      endMonth: number;
      endYear: number;
    },
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const { startMonth, startYear, endMonth, endYear } = body;

    // Validaciones
    if (
      !startMonth ||
      !startYear ||
      !endMonth ||
      !endYear ||
      startMonth < 1 ||
      startMonth > 12 ||
      endMonth < 1 ||
      endMonth > 12 ||
      startYear < 2000 ||
      endYear < 2000
    ) {
      throw new BadRequestException('Parámetros de fechas inválidos');
    }

    if (
      startYear > endYear ||
      (startYear === endYear && startMonth > endMonth)
    ) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    return this.historicalSnapshotService.backfillSnapshots(
      startMonth,
      startYear,
      endMonth,
      endYear,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

}
