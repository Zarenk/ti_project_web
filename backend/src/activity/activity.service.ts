import { Injectable } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import { QueryActivityDto } from './dto/query-activity.dto';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async log(
    data: {
      actorId?: number | null;
      actorEmail?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      action: AuditAction;
      summary?: string | null;
      diff?: Prisma.JsonValue;
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
    } = query;

    const where: Prisma.AuditLogWhereInput = {};

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

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }

  async findAllByUser(userId: number) {
    return this.prisma.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: 'desc' },
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
