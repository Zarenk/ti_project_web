import { Body, Controller, Post } from '@nestjs/common';
import { WebSalesService } from './websales.service';
import { CreateWebSaleDto } from './dto/create-websale.dto';

@Controller('web-sales')
export class WebSalesController {
  constructor(private readonly webSalesService: WebSalesService) {}

  @Post()
  async create(@Body() dto: CreateWebSaleDto) {
    return this.webSalesService.createWebSale(dto);
  }
}