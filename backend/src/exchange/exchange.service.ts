import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTipoCambioDto } from './dto/create-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { zonedTimeToUtc } from 'date-fns-tz';
import { ActivityService } from '../activity/activity.service';
import { AuditAction, Prisma } from '@prisma/client';
import { Request } from 'express';
import {
  buildOrganizationFilter,
  resolveOrganizationId,
} from 'src/tenancy/organization.utils';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import { toJsonSafe } from 'src/utils/json-safe';

@Injectable()
export class ExchangeService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(
    dto: CreateTipoCambioDto,
    req: Request,
    organizationId?: number | null,
  ) {
    const timeZone = 'America/Lima'; // Define la zona horaria deseada
    const fechaUtc = zonedTimeToUtc(dto.fecha, timeZone); // Convierte la fecha a UTC

    const user = (
      req as Request & { user?: { userId?: number; username?: string } }
    ).user;

    const providedOrganizationId = (
      dto as CreateTipoCambioDto & { organizationId?: number | null }
    ).organizationId;

    const resolvedOrganizationId = resolveOrganizationId({
      provided: providedOrganizationId,
      fallbacks: [organizationId],
      mismatchError:
        'La organización del tipo de cambio no coincide con el contexto actual.',
    });

    logOrganizationContext({
      service: ExchangeService.name,
      operation: 'create',
      organizationId: resolvedOrganizationId ?? null,
      metadata: { currency: dto.moneda },
    });

    const organizationMatch =
      resolvedOrganizationId === null
        ? { organizationId: null }
        : resolvedOrganizationId === undefined
          ? {}
          : { organizationId: resolvedOrganizationId };

    const existing = await this.prisma.tipoCambio.findFirst({
      where: {
        fecha: fechaUtc,
        moneda: dto.moneda,
        ...organizationMatch,
      },
    });

    let rate;
    if (existing) {
      rate = await this.prisma.tipoCambio.update({
        where: { id: existing.id },
        data: {
          valor: dto.valor,
        },
      });
    } else {
      rate = await this.prisma.tipoCambio.create({
        data: {
          fecha: fechaUtc, // Usa la fecha en UTC
          moneda: dto.moneda,
          valor: dto.valor,
          organizationId: resolvedOrganizationId ?? null,
        } as Prisma.TipoCambioUncheckedCreateInput,
      });
    }

    await this.activityService.log(
      {
        actorId: user?.userId,
        actorEmail: user?.username,
        entityType: 'ExchangeRate',
        entityId: rate.id.toString(),
        action: existing ? AuditAction.UPDATED : AuditAction.CREATED,
        summary: `Tipo de cambio ${dto.moneda} ${existing ? 'actualizado' : 'creado'} a ${dto.valor}`,
        diff: existing
          ? toJsonSafe({ before: existing, after: rate })
          : toJsonSafe({ after: rate }),
      },
      req,
    );

    return rate;
  }

  async update(
    id: number,
    dto: UpdateExchangeDto,
    req: Request,
    organizationId?: number | null,
  ) {
    const organizationFilter = buildOrganizationFilter(organizationId);
    const before = await this.prisma.tipoCambio.findFirst({
      where: { id, ...organizationFilter },
      select: {
        id: true,
        fecha: true,
        moneda: true,
        valor: true,
        createdAt: true,
        organizationId: true, // <-- necesario para logOrganizationContext
      },
    });
    if (!before) {
      throw new NotFoundException('Tipo de cambio no encontrado.');
    }

    logOrganizationContext({
      service: ExchangeService.name,
      operation: 'update',
      organizationId: before.organizationId ?? null,
      metadata: { exchangeId: id },
    });

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
                fecha:
                  before.fecha instanceof Date
                    ? before.fecha.toISOString()
                    : before.fecha,
                createdAt:
                  before.createdAt instanceof Date
                    ? before.createdAt.toISOString()
                    : before.createdAt,
              }
            : null,
          after: {
            ...updated,
            fecha:
              updated.fecha instanceof Date
                ? updated.fecha.toISOString()
                : updated.fecha,
            createdAt:
              updated.createdAt instanceof Date
                ? updated.createdAt.toISOString()
                : updated.createdAt,
          },
        },
      },
      req,
    );

    return updated;
  }

  async setRate(
    dto: CreateTipoCambioDto,
    req: Request,
    organizationId?: number | null,
  ) {
    return this.create(dto, req, organizationId);
  }

  async findAll(organizationId?: number | null) {
    const where = buildOrganizationFilter(organizationId);

    logOrganizationContext({
      service: ExchangeService.name,
      operation: 'findAll',
      organizationId:
        organizationId === undefined ? undefined : (organizationId ?? null),
    });

    return this.prisma.tipoCambio.findMany({
      where,
      orderBy: { fecha: 'desc' },
    });
  }

  // Método para obtener el tipo de cambio más reciente por moneda
  async getLatestByMoneda(moneda: string, organizationId?: number | null) {
    const where = {
      moneda,
      ...buildOrganizationFilter(organizationId),
    };

    logOrganizationContext({
      service: ExchangeService.name,
      operation: 'getLatestByMoneda',
      organizationId:
        organizationId === undefined ? undefined : (organizationId ?? null),
      metadata: { currency: moneda },
    });

    return this.prisma.tipoCambio.findFirst({
      where,
      orderBy: { fecha: 'desc' },
    });
  }
}
