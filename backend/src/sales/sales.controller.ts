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
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EMPLOYEE', 'SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG')
@ModulePermission('sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSale(
    @Body() createSaleDto: CreateSaleDto,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.createSale({
      ...createSaleDto,
      organizationId:
        createSaleDto.organizationId ?? organizationId ?? undefined,
    });
  }

  @Get()
  async findAllSales(
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.findAllSales(organizationId ?? undefined);
  }

  // Endpoint para obtener las series vendidas en una venta especifica
  @Get(':saleId/sold-series')
  async getSoldSeriesBySale(
    @Param('saleId', ParseIntPipe) saleId: number,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.getSoldSeriesBySale(
      saleId,
      organizationId ?? undefined,
    );
  }

  @Get('monthly-total')
  async getMonthlySalesTotal(
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.getMonthlySalesTotal(organizationId ?? undefined);
  }

  @Get('revenue-by-category/from/:startDate/to/:endDate')
  getRevenueByCategoryByRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.getRevenueByCategory(
      new Date(startDate),
      new Date(endDate),
      organizationId ?? undefined,
    );
  }

  @Get('chart/:from/:to')
  async getSalesChartByDateRange(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.getDailySalesByDateRange(
      new Date(from),
      new Date(to),
      organizationId ?? undefined,
    );
  }

  // En el controlador
  @Get('top-products/from/:startDate/to/:endDate')
  getTopProductsByRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.getTopProducts(
      10,
      startDate,
      endDate,
      organizationId ?? undefined,
    );
  }

  @Get('top-products/type/:type')
  getTopProductsByType(
    @Param('type') type: string,
    @CurrentTenant('organizationId') organizationId: number | null,
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
        );
      case 'all':
        return this.salesService.getTopProducts(
          10,
          undefined,
          undefined,
          organizationId ?? undefined,
        );
      default:
        throw new BadRequestException(`Tipo invalido: ${type}`);
    }
  }

  @Get('monthly-count')
  async getMonthlySalesCount(
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.getMonthlySalesCount(organizationId ?? undefined);
  }

  @Get('monthly-clients')
  getMonthlyClientStats(
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.getMonthlyClientStats(organizationId ?? undefined);
  }

  @Get('top-clients')
  getTopClients(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
  ) {
    return this.salesService.getTopClients(
      10,
      from,
      to,
      organizationId ?? undefined,
    );
  }

  @Get('product-report/:productId')
  getProductReport(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
  ) {
    return this.salesService.getProductSalesReport(
      productId,
      from,
      to,
      organizationId ?? undefined,
    );
  }

  @Get('transactions')
  getSalesTransactions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
  ) {
    return this.salesService.getSalesTransactions(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      organizationId ?? undefined,
    );
  }

  @Get('my')
  @Roles('CLIENT')
  async getMySales(
    @Req() req,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.findSalesByUser(
      req.user.userId,
      organizationId ?? undefined,
    );
  }

  @Get('recent/:from/:to')
  async getRecentSales(
    @Param('from') from: string,
    @Param('to') to: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
  ) {
    return this.salesService.getRecentSales(
      from,
      to,
      10,
      organizationId ?? undefined,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.salesService.findOne(id, organizationId ?? undefined);
  }

  @Delete(':id')
  async deleteSale(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    const userId = req?.user?.userId;
    return this.salesService.deleteSale(
      id,
      userId,
      organizationId ?? undefined,
    );
  }
}
