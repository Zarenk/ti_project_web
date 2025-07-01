import { Injectable } from '@nestjs/common';
import { CreateExchangeDto, CreateTipoCambioDto } from './dto/create-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { zonedTimeToUtc } from 'date-fns-tz';

@Injectable()
export class ExchangeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTipoCambioDto) {
    const timeZone = 'America/Lima'; // Define la zona horaria deseada
    const fechaUtc = zonedTimeToUtc(dto.fecha, timeZone); // Convierte la fecha a UTC
  
    return this.prisma.tipoCambio.upsert({
      where: {
        fecha_moneda: {
          fecha: fechaUtc, // Usa la fecha en UTC
          moneda: dto.moneda,
        },
      },
      update: {
        valor: dto.valor,
      },
      create: {
        fecha: fechaUtc, // Usa la fecha en UTC
        moneda: dto.moneda,
        valor: dto.valor,
      },
    });
  }

  async findAll() {
    return this.prisma.tipoCambio.findMany({
      orderBy: { fecha: 'desc' },
    });
  }

  // Método para obtener el tipo de cambio más reciente por moneda
  async getLatestByMoneda(moneda: string) {
    return this.prisma.tipoCambio.findFirst({
      where: { moneda },
      orderBy: { fecha: 'desc' },
    });
  }
}