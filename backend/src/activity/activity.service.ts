import { Injectable } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import { QueryActivityDto } from './dto/query-activity.dto';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  private resolveHeaderId(value: string | string[] | undefined): number | undefined {
    const candidate = Array.isArray(value) ? value[0] : value;
    if (typeof candidate !== 'string') {
      return undefined;
    }
    const parsed = Number(candidate.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async log(
    data: {
      actorId?: number | null;
      actorEmail?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      action: AuditAction;
      summary?: string | null;
      diff?: Prisma.JsonValue;
      organizationId?: number | null;
      companyId?: number | null;
    },
    req?: Request,
  ) {
    const ip = req?.ip || undefined;
    const userAgent = req?.headers?.['user-agent'] || undefined;
    // Ensure actorEmail is populated when actorId is present
    let resolvedActorEmail = data.actorEmail ?? undefined;
    if (!resolvedActorEmail && data.actorId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: data.actorId },
          select: { username: true, email: true },
        });
        resolvedActorEmail = user?.username || user?.email || undefined;
      } catch (_) {
        // ignore lookup failures; keep undefined
      }
    }

    const resolvedOrganizationId =
      data.organizationId ?? this.resolveHeaderId(req?.headers?.['x-org-id']);
    const resolvedCompanyId =
      data.companyId ?? this.resolveHeaderId(req?.headers?.['x-company-id']);

    return this.prisma.auditLog.create({
      data: {
        actorId: data.actorId ?? undefined,
        actorEmail: resolvedActorEmail,
        entityType: data.entityType ?? undefined,
        entityId: data.entityId ?? undefined,
        action: data.action,
        summary: data.summary ?? undefined,
        diff: data.diff ?? undefined,
        ip,
        userAgent,
        organizationId: resolvedOrganizationId ?? undefined,
        companyId: resolvedCompanyId ?? undefined,
      },
    });
  }

  async findAll(query: QueryActivityDto) {
    const {
      page = 1,
      pageSize = 20,
      q,
      actorId,
      entityType,
      action,
      dateFrom,
      dateTo,
      excludeContextUpdates,
    } = query;

    const where: Prisma.AuditLogWhereInput = {};
    const andFilters: Prisma.AuditLogWhereInput[] = [];

    if (q) {
      where.OR = [
        { summary: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { actorEmail: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (actorId) where.actorId = Number(actorId);
    if (entityType) where.entityType = entityType;
    if (action) where.action = action as AuditAction;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (excludeContextUpdates) {
      const excludeNeedles = [
        'actualizo el contexto',
        'actualizó el contexto',
        'contexto a org',
      ];
      andFilters.push({
        NOT: {
          OR: excludeNeedles.map((needle) => ({
            summary: { contains: needle, mode: 'insensitive' },
          })),
        },
      });
    }

    if (andFilters.length > 0) {
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [...existingAnd, ...andFilters];
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          organization: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  async findAllByUser(userId: number) {
    return this.prisma.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  async stats() {
    const byAction = await this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
    });
    const byEntity = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      _count: { entityType: true },
    });
    return { byAction, byEntity };
  }
}
