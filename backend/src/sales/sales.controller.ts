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
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EMPLOYEE')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSale(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.createSale(createSaleDto);
  }

  @Get()
  async findAllSales() {
    return this.salesService.findAllSales();
  }

  // Endpoint para obtener las series vendidas en una venta específica
  @Get(':saleId/sold-series')
  async getSoldSeriesBySale(@Param('saleId', ParseIntPipe) saleId: number) {
    return this.salesService.getSoldSeriesBySale(saleId);
  }

  @Get('monthly-total')
  async getMonthlySalesTotal() {
    return this.salesService.getMonthlySalesTotal();
  }

  @Get('revenue-by-category/from/:startDate/to/:endDate')
  getRevenueByCategoryByRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.salesService.getRevenueByCategory(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('chart/:from/:to')
  async getSalesChartByDateRange(
    @Param('from') from: string,
    @Param('to') to: string,
  ) {
    return this.salesService.getDailySalesByDateRange(
      new Date(from),
      new Date(to),
    );
  }

  // En el controlador
  @Get('top-products/from/:startDate/to/:endDate')
  getTopProductsByRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.salesService.getTopProducts(10, startDate, endDate);
  }

  @Get('top-products/type/:type')
  getTopProductsByType(@Param('type') type: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (type) {
      case 'month':
        return this.salesService.getTopProducts(
          10,
          startOfMonth.toISOString(),
          endOfMonth.toISOString(),
        );
      case 'all':
        return this.salesService.getTopProducts(10);
      default:
        throw new BadRequestException(`Tipo inválido: ${type}`);
    }
  }

  @Get('monthly-count')
  async getMonthlySalesCount() {
    return this.salesService.getMonthlySalesCount();
  }

  @Get('monthly-clients')
  getMonthlyClientStats() {
    return this.salesService.getMonthlyClientStats();
  }

  @Get('my')
  @Roles('CLIENT')
  async getMySales(@Req() req) {
    return this.salesService.findSalesByUser(req.user.userId);
  }

  @Get('recent/:from/:to')
  async getRecentSales(@Param('from') from: string, @Param('to') to: string) {
    return this.salesService.getRecentSales(from, to);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }
}
