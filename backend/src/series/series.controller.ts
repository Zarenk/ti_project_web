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
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
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
}
