import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { WebSalesService } from './websales.service';
import { CreateWebSaleDto } from './dto/create-websale.dto';

@Controller('web-sales')
export class WebSalesController {
  constructor(private readonly webSalesService: WebSalesService) {}

  @Post()
  async create(@Body() dto: CreateWebSaleDto) {
    return this.webSalesService.createWebSale(dto);
  }

  @Post('order')
  async createOrder(@Body() dto: CreateWebSaleDto) {
    return this.webSalesService.createWebOrder(dto);
  }

  @Post('order/:id/complete')
  async completeOrder(@Param('id', ParseIntPipe) id: number) {
    return this.webSalesService.completeWebOrder(id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.webSalesService.getWebSaleById(id);
  }

  @Get('order/:id')
  async findOrder(@Param('id', ParseIntPipe) id: number) {
    return this.webSalesService.getWebOrderById(id);
  }
}