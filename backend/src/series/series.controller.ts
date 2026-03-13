import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { SeriesService } from './series.service';
import { RegisterSeriesDto } from './dto/create-series.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('series')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Post('check')
  async checkSeries(@Body() body: { serial: string }) {
    const { serial } = body;

    if (!serial) {
      throw new BadRequestException('El número de serie es obligatorio.');
    }

    // Delegar la lógica al servicio
    return this.seriesService.checkSeries(serial);
  }

  @Post('batch-check')
  async batchCheckSeries(@Body() body: { serials: string[] }) {
    const { serials } = body;

    if (!Array.isArray(serials)) {
      throw new BadRequestException('Se requiere un array de series.');
    }

    return this.seriesService.batchCheckSeries(serials);
  }

  @Post('register')
  async registerSeries(@Body() dto: RegisterSeriesDto) {
    return this.seriesService.registerSeries(dto);
  }
}
