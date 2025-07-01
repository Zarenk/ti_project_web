import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { CreateExchangeDto, CreateTipoCambioDto } from './dto/create-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';

@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post()
  create(@Body() createExchangeDto: CreateTipoCambioDto) {
    return this.exchangeService.create(createExchangeDto);
  }

  @Get()
  findAll() {
    return this.exchangeService.findAll();
  }

  // Endpoint para obtener el tipo de cambio más reciente por moneda
  @Get('latest/:moneda')
  getLatestByMoneda(@Param('moneda') moneda: string) {
    return this.exchangeService.getLatestByMoneda(moneda);
  }
}
