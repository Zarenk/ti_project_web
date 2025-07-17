import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, BadRequestException, Query } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async createSale(@Body() body: {
    userId: number;
    storeId: number;
    clientId: number;
    total: number;
    description?: string;
    details: { productId: number; quantity: number; price: number }[];
    tipoComprobante?: string; // Tipo de comprobante (factura, boleta, etc.)
    tipoMoneda: string;
    payments: { paymentMethodId: number; amount: number; currency: string }[]; // 🔥 AÑADIDO
    source?: 'POS' | 'WEB';
  }) {
    return this.salesService.createSale(body);
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

  @Get("monthly-total")
  async getMonthlySalesTotal() {
    return this.salesService.getMonthlySalesTotal();
  }

  @Get('revenue-by-category/from/:startDate/to/:endDate')
  getRevenueByCategoryByRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.salesService.getRevenueByCategory(new Date(startDate), new Date(endDate));
  }

  @Get('chart/:from/:to')
  async getSalesChartByDateRange(
    @Param('from') from: string,
    @Param('to') to: string,
  ) {
    return this.salesService.getDailySalesByDateRange(new Date(from), new Date(to));
  }

  // En el controlador
  @Get('top-products/from/:startDate/to/:endDate')
  getTopProductsByRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string
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
        return this.salesService.getTopProducts(10, startOfMonth.toISOString(), endOfMonth.toISOString());
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

  @Get('recent/:from/:to')
  async getRecentSales(
    @Param('from') from: string,
    @Param('to') to: string,
  ) {
    return this.salesService.getRecentSales(from, to);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }
}
