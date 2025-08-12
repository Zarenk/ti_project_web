import { Controller, Get, Post, Body, Patch, Param, Req } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { CreateExchangeDto, CreateTipoCambioDto } from './dto/create-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';
import { Request } from 'express';

@Controller('exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post()
  create(@Body() createExchangeDto: CreateTipoCambioDto, @Req() req: Request) {
    return this.exchangeService.create(createExchangeDto, req);
  }

  @Post('set-rate')
  setRate(@Body() dto: CreateTipoCambioDto, @Req() req: Request) {
    return this.exchangeService.setRate(dto, req);
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

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExchangeDto: UpdateExchangeDto,
    @Req() req: Request,
  ) {
    return this.exchangeService.update(+id, updateExchangeDto, req);
  }
}
