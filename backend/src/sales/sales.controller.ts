import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
  Req,
  Query,
  Delete,
  Logger,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { EntityOwnershipGuard, EntityModel, EntityIdParam } from 'src/common/guards/entity-ownership.guard';

const SALES_ALLOWED_ROLES = [
  'ADMIN',
  'EMPLOYEE',
  'SUPER_ADMIN_GLOBAL',
  'SUPER_ADMIN_ORG',
] as const;

@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(...SALES_ALLOWED_ROLES)
@ModulePermission('sales')
@Controller('sales')
export class SalesController {
  private readonly logger = new Logger(SalesController.name);

  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSale(
    @Body() createSaleDto: CreateSaleDto,
    @CurrentTenant() fullTenant: any,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const isSuperAdmin = fullTenant?.isSuperAdmin ?? false;
    this.logger.debug(`[POST /sales] TenantContext received: isSuperAdmin=${isSuperAdmin}, fullTenant=${JSON.stringify(fullTenant)}`);
    return this.salesService.createSale({
      ...createSaleDto,
      organizationId:
        createSaleDto.organizationId ?? organizationId ?? undefined,
      companyId: createSaleDto.companyId ?? companyId ?? undefined,
      isSuperAdmin,
    });
  }

  @Get()
  async findAllSales(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.findAllSales(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // Endpoint para obtener las series vendidas en una venta especifica
  @Get(':saleId/sold-series')
  async getSoldSeriesBySale(
    @Param('saleId', ParseIntPipe) saleId: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getSoldSeriesBySale(
      saleId,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get(':saleId/sunat/transmissions')
  async getSaleSunatTransmissions(
    @Param('saleId', ParseIntPipe) saleId: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getSaleSunatTransmissions(
      saleId,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('monthly-total')
  async getMonthlySalesTotal(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getMonthlySalesTotal(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('monthly-profit')
  async getMonthlySalesProfit(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getMonthlySalesProfit(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('total/from/:from/to/:to')
  async getSalesTotalByRange(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getSalesTotalByRange(
      new Date(from),
      new Date(to),
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('count/from/:from/to/:to')
  async getSalesCountByRange(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getSalesCountByRange(
      new Date(from),
      new Date(to),
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('taxes/from/:from/to/:to')
  async getSalesTaxByRange(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getSalesTaxByRange(
      new Date(from),
      new Date(to),
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('clients/from/:from/to/:to')
  async getClientStatsByRange(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getClientStatsByRange(
      new Date(from),
      new Date(to),
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('profit/from/:from/to/:to')
  async getSalesProfitByRange(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getSalesProfitByRange(
      new Date(from),
      new Date(to),
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('revenue-by-category/from/:startDate/to/:endDate')
  getRevenueByCategoryByRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getRevenueByCategory(
      new Date(startDate),
      new Date(endDate),
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('chart/:from/:to')
  async getSalesChartByDateRange(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getDailySalesByDateRange(
      new Date(from),
      new Date(to),
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // En el controlador
  @Get('top-products/from/:startDate/to/:endDate')
  getTopProductsByRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getTopProducts(
      10,
      startDate,
      endDate,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('top-products/type/:type')
  getTopProductsByType(
    @Param('type') type: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (type) {
      case 'month':
        return this.salesService.getTopProducts(
          10,
          startOfMonth.toISOString(),
          endOfMonth.toISOString(),
          organizationId ?? undefined,
          companyId ?? undefined,
        );
      case 'all':
        return this.salesService.getTopProducts(
          10,
          undefined,
          undefined,
          organizationId ?? undefined,
          companyId ?? undefined,
        );
      default:
        throw new BadRequestException(`Tipo invalido: ${type}`);
    }
  }

  @Get('monthly-count')
  async getMonthlySalesCount(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getMonthlySalesCount(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('monthly-clients')
  getMonthlyClientStats(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.getMonthlyClientStats(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('top-clients')
  getTopClients(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    return this.salesService.getTopClients(
      10,
      from,
      to,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('product-report-options')
  getProductReportOptions(
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    return this.salesService.getProductReportOptions(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('product-report/:productId')
  getProductReport(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    return this.salesService.getProductSalesReport(
      productId,
      from,
      to,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('profit/products')
  async getProductsProfitByRange(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '25',
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const p = Number.parseInt(page as any) || 1
    const ps = Number.parseInt(pageSize as any) || 25
    return this.salesService.getProductsProfitByRange(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      q ?? undefined,
      p,
      ps,
      organizationId ?? undefined,
      companyId ?? undefined,
    )
  }

  @Get('profit/chart/:from/:to')
  async getProfitChartByDateRange(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    return this.salesService.getDailyProfitByDateRange(
      new Date(from),
      new Date(to),
      organizationId ?? undefined,
      companyId ?? undefined,
    )
  }

  @Get('transactions')
  getSalesTransactions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    return this.salesService.getSalesTransactions(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('my')
  @Roles('CLIENT')
  async getMySales(
    @Req() req,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.findSalesByUser(
      req.user.userId,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get('recent/:from/:to')
  async getRecentSales(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    return this.salesService.getRecentSales(
      from,
      to,
      10,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.salesService.findOne(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Delete(':id')
  @UseGuards(EntityOwnershipGuard)
  @EntityModel('sales')
  @EntityIdParam('id')
  async deleteSale(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    // 🔒 Ownership validado por EntityOwnershipGuard
    const userId = req?.user?.userId;
    return this.salesService.deleteSale(
      id,
      userId,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }
}
