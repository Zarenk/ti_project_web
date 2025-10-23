import { Injectable } from '@nestjs/common';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SeriesService {
  constructor(private prisma: PrismaService) {}

  async checkSeries(serial: string): Promise<{ exists: boolean }> {
    // Verificar si la serie ya existe en la base de datos
    const existingSeries = await this.prisma.entryDetailSeries.findFirst({
      where: { serial },
    });

    return { exists: !!existingSeries }; // Retornar true si existe, false si no
  }
}
