import { Controller, Get, Post, Body, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import {
  CreateExchangeDto,
  CreateTipoCambioDto,
} from './dto/create-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';
import { Request } from 'express';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('exchange')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Post()
  create(
    @Body() createExchangeDto: CreateTipoCambioDto,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.exchangeService.create(
      createExchangeDto,
      req,
      organizationId === undefined ? undefined : organizationId,
    );
  }

  @Post('set-rate')
  setRate(
    @Body() dto: CreateTipoCambioDto,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.exchangeService.setRate(
      dto,
      req,
      organizationId === undefined ? undefined : organizationId,
    );
  }

  @Get()
  findAll(@CurrentTenant('organizationId') organizationId: number | null) {
    return this.exchangeService.findAll(
      organizationId === undefined ? undefined : organizationId,
    );
  }

  // Endpoint para obtener el tipo de cambio más reciente por moneda
  @Get('latest/:moneda')
  getLatestByMoneda(
    @Param('moneda') moneda: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.exchangeService.getLatestByMoneda(
      moneda,
      organizationId === undefined ? undefined : organizationId,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExchangeDto: UpdateExchangeDto,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.exchangeService.update(
      +id,
      updateExchangeDto,
      req,
      organizationId === undefined ? undefined : organizationId,
    );
  }
}
