import { Injectable } from '@nestjs/common';
import { CreateTipoCambioDto } from './dto/create-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { zonedTimeToUtc } from 'date-fns-tz';
import { ActivityService } from '../activity/activity.service';
import { AuditAction } from '@prisma/client';
import { Request } from 'express';

@Injectable()
export class ExchangeService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(dto: CreateTipoCambioDto, req: Request) {
    const timeZone = 'America/Lima'; // Define la zona horaria deseada
    const fechaUtc = zonedTimeToUtc(dto.fecha, timeZone); // Convierte la fecha a UTC
  
    const user = (
      req as Request & { user?: { userId?: number; username?: string } }
    ).user;

    const existing = await this.prisma.tipoCambio.findUnique({
      where: {
        fecha_moneda: {
          fecha: fechaUtc, // Usa la fecha en UTC
          moneda: dto.moneda,
        },
      },
    });

    const rate = await this.prisma.tipoCambio.upsert({
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

    await this.activityService.log(
      {
        actorId: user?.userId,
        actorEmail: user?.username,
        entityType: 'ExchangeRate',
        entityId: rate.id.toString(),
        action: existing ? AuditAction.UPDATED : AuditAction.CREATED,
        summary: `Tipo de cambio ${dto.moneda} ${existing ? 'actualizado' : 'creado'} a ${dto.valor}`,
        diff: existing
          ? {
              before: {
                ...existing,
                fecha: existing.fecha instanceof Date ? existing.fecha.toISOString() : existing.fecha,
                createdAt: existing.createdAt instanceof Date ? existing.createdAt.toISOString() : existing.createdAt,
              },
              after: {
                ...rate,
                fecha: rate.fecha instanceof Date ? rate.fecha.toISOString() : rate.fecha,
                createdAt: rate.createdAt instanceof Date ? rate.createdAt.toISOString() : rate.createdAt,
              },
            }
          : {
              after: {
                ...rate,
                fecha: rate.fecha instanceof Date ? rate.fecha.toISOString() : rate.fecha,
                createdAt: rate.createdAt instanceof Date ? rate.createdAt.toISOString() : rate.createdAt,
              },
            },
      },
      req,
    );

    return rate;
  }

  async update(id: number, dto: UpdateExchangeDto, req: Request) {
    const before = await this.prisma.tipoCambio.findUnique({ where: { id } });
    const updated = await this.prisma.tipoCambio.update({
      where: { id },
      data: dto,
    });
    const user = (
      req as Request & { user?: { userId?: number; username?: string } }
    ).user;

    await this.activityService.log(
      {
        actorId: user?.userId,
        actorEmail: user?.username,
        entityType: 'ExchangeRate',
        entityId: id.toString(),
        action: AuditAction.UPDATED,
        summary: `Tipo de cambio ${updated.moneda} actualizado a ${updated.valor}`,
        diff: {
          before: before
            ? {
                ...before,
                fecha: before.fecha instanceof Date ? before.fecha.toISOString() : before.fecha,
                createdAt: before.createdAt instanceof Date ? before.createdAt.toISOString() : before.createdAt,
              }
            : null,
          after: {
            ...updated,
            fecha: updated.fecha instanceof Date ? updated.fecha.toISOString() : updated.fecha,
            createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
          },
        },
      },
      req,
    );

    return updated;
  }

  async setRate(dto: CreateTipoCambioDto, req: Request) {
    return this.create(dto, req);
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