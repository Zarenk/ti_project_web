import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

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
  }) {
    return this.salesService.createSale(body);
  }

  @Get()
  async findAllSales() {
    return this.salesService.findAllSales();
  }
}
