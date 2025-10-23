import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';

@Controller('series')
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
