import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';
import { QueryActivityDto } from './dto/query-activity.dto';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  private resolveHeaderId(
    value: string | string[] | undefined,
  ): number | undefined {
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

  async findAll(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const { page = 1, pageSize = 20 } = query;
    const where = this.applyTenantScope(
      this.buildWhere(query),
      organizationId,
      companyId,
    );
    const orderBy = this.resolveOrderBy(query);

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy,
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

  async findOne(
    id: string,
    organizationId?: number,
    companyId?: number,
  ) {
    return this.prisma.auditLog.findFirst({
      where: this.applyTenantScope({ id }, organizationId, companyId),
      include: {
        organization: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  async findAllByUser(
    userId: number,
    organizationId?: number,
    companyId?: number,
  ) {
    return this.prisma.auditLog.findMany({
      where: this.applyTenantScope(
        { actorId: userId },
        organizationId,
        companyId,
      ),
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  async userSummary(
    userId: number,
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const where = this.applyTenantScope(
      this.buildWhere(query),
      organizationId,
      companyId,
    );
    where.actorId = userId;

    const [total, byAction, byEntity, byUser] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['actorId', 'actorEmail'],
        _count: { actorId: true },
        where,
        orderBy: { _count: { actorId: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      total,
      byAction: byAction.map((entry) => ({
        action: entry.action,
        count: entry._count.action,
      })),
      byEntity: byEntity.map((entry) => ({
        entityType: entry.entityType,
        count: entry._count.entityType,
      })),
    };
  }

  async userTimeSeries(
    userId: number,
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    return this.timeSeries(
      {
        ...query,
        actorId: String(userId),
      },
      organizationId,
      companyId,
    );
  }

  async userBreakdown(
    userId: number,
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const where = this.applyTenantScope(
      this.buildWhere(query),
      organizationId,
      companyId,
    );
    where.actorId = userId;

    const [byAction, byEntity] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        where,
      }),
    ]);

    return {
      actions: byAction.map((entry) => ({
        action: entry.action,
        count: entry._count.action,
      })),
      entities: byEntity.map((entry) => ({
        entityType: entry.entityType,
        count: entry._count.entityType,
      })),
    };
  }

  async userOptions(
    userId: number,
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const sanitizedQuery: QueryActivityDto = {
      ...query,
      action: undefined,
      entityType: undefined,
      severity: undefined,
    };
    const where = this.applyTenantScope(
      this.buildWhere(sanitizedQuery),
      organizationId,
      companyId,
    );
    where.actorId = userId;

    const [byAction, byEntity] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        where,
      }),
    ]);

    const actionLimit = query.actionLimit
      ? Math.max(1, Number(query.actionLimit))
      : 50;
    const entityLimit = query.entityLimit
      ? Math.max(1, Number(query.entityLimit))
      : 50;

    const actions = byAction
      .sort((a, b) => (b._count.action ?? 0) - (a._count.action ?? 0))
      .map((entry) => entry.action)
      .filter(Boolean)
      .slice(0, actionLimit);
    const entities = byEntity
      .sort((a, b) => (b._count.entityType ?? 0) - (a._count.entityType ?? 0))
      .map((entry) => entry.entityType)
      .filter(Boolean)
      .slice(0, entityLimit);

    const defaultActions: AuditAction[] = [
      AuditAction.CREATED,
      AuditAction.UPDATED,
      AuditAction.DELETED,
      AuditAction.LOGIN,
      AuditAction.LOGOUT,
      AuditAction.OTHER,
    ];
    const defaultEntities = [
      'Product',
      'Provider',
      'Store',
      'Category',
      'Brand',
      'InventoryItem',
      'Sale',
      'Order',
      'User',
      'ChatMessage',
      'ExchangeRate',
      'organization',
      'subscription',
      'subscription_invoice',
      'template',
    ];

    return {
      actions: actions.length > 0 ? actions : defaultActions,
      entities: entities.length > 0 ? entities : defaultEntities,
    };
  }

  async organizationSummary(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const now = new Date();
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : now;
    const excludedActorIds = await this.getGlobalAdminIds();

    const where = this.applyExcludedActorIds(
      this.applyTenantScope(
        this.buildWhere({
          ...query,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
        }),
        organizationId,
        companyId,
      ),
      excludedActorIds,
    );

    const [total, byAction, byEntity, byUser] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['actorId', 'actorEmail'],
        _count: { actorId: true },
        where,
        orderBy: { _count: { actorId: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      total,
      byAction: byAction.map((entry) => ({
        action: entry.action,
        count: entry._count.action,
      })),
      byEntity: byEntity.map((entry) => ({
        entityType: entry.entityType,
        count: entry._count.entityType,
      })),
      topUsers: byUser.map((entry) => ({
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        count: entry._count.actorId ?? 0,
      })),
      range: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    };
  }

  async organizationTimeSeries(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    return this.timeSeries(query, organizationId, companyId, {
      excludeGlobalAdmins: true,
    });
  }

  async organizationBreakdown(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const excludedActorIds = await this.getGlobalAdminIds();
    const where = this.applyExcludedActorIds(
      this.applyTenantScope(this.buildWhere(query), organizationId, companyId),
      excludedActorIds,
    );

    const [byAction, byEntity] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        where,
      }),
    ]);

    return {
      actions: byAction.map((entry) => ({
        action: entry.action,
        count: entry._count.action,
      })),
      entities: byEntity.map((entry) => ({
        entityType: entry.entityType,
        count: entry._count.entityType,
      })),
    };
  }

  async organizationOptions(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const sanitizedQuery: QueryActivityDto = {
      ...query,
      q: undefined,
      actorId: undefined,
      excludeContextUpdates: undefined,
      action: undefined,
      entityType: undefined,
      severity: undefined,
    };
    const excludedActorIds = await this.getGlobalAdminIds();
    const where = this.applyExcludedActorIds(
      this.applyTenantScope(this.buildWhere(sanitizedQuery), organizationId, companyId),
      excludedActorIds,
    );

    const [byAction, byEntity] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        where,
      }),
    ]);

    const actionLimit = query.actionLimit
      ? Math.max(1, Number(query.actionLimit))
      : 50;
    const entityLimit = query.entityLimit
      ? Math.max(1, Number(query.entityLimit))
      : 50;

    return {
      actions: byAction
        .sort((a, b) => (b._count.action ?? 0) - (a._count.action ?? 0))
        .map((entry) => entry.action)
        .filter(Boolean)
        .slice(0, actionLimit),
      entities: byEntity
        .sort((a, b) => (b._count.entityType ?? 0) - (a._count.entityType ?? 0))
        .map((entry) => entry.entityType)
        .filter(Boolean)
        .slice(0, entityLimit),
    };
  }

  async organizationActivity(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const { page = 1, pageSize = 100 } = query;
    const excludedActorIds = await this.getGlobalAdminIds();
    const where = this.applyExcludedActorIds(
      this.applyTenantScope(this.buildWhere(query), organizationId, companyId),
      excludedActorIds,
    );
    const orderBy = this.resolveOrderBy(query);

    return this.prisma.auditLog.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        organization: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  async stats(organizationId?: number, companyId?: number) {
    const where = this.applyTenantScope({}, organizationId, companyId);
    const byAction = await this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      where,
    });
    const byEntity = await this.prisma.auditLog.groupBy({
      by: ['entityType'],
      _count: { entityType: true },
      where,
    });
    return { byAction, byEntity };
  }

  async summary(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const now = new Date();
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : now;

    const where = this.applyTenantScope(
      this.buildWhere({
        ...query,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      }),
      organizationId,
      companyId,
    );

    const [total, byAction, byEntity, byUser] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { entityType: true },
        where,
      }),
      this.prisma.auditLog.groupBy({
        by: ['actorId', 'actorEmail'],
        _count: { actorId: true },
        where,
        orderBy: { _count: { actorId: 'desc' } },
        take: 10,
      }),
    ]);

    const usersActive = new Set(
      byUser
        .map((entry) => entry.actorId)
        .filter((id): id is number => typeof id === 'number'),
    ).size;

    return {
      total,
      usersActive,
      byAction: byAction.map((entry) => ({
        action: entry.action,
        count: entry._count.action,
      })),
      byEntity: byEntity.map((entry) => ({
        entityType: entry.entityType,
        count: entry._count.entityType,
      })),
      topUsers: byUser.map((entry) => ({
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        count: entry._count.actorId ?? 0,
      })),
      range: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    };
  }

  async timeSeries(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
    options?: { excludeGlobalAdmins?: boolean },
  ) {
    const now = new Date();
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : now;

    const conditions = await this.buildActivityConditions(
      query,
      dateFrom,
      dateTo,
      organizationId,
      companyId,
      options,
    );
    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const rows = await this.prisma.$queryRaw<
      Array<{ day: Date; count: number }>
    >(Prisma.sql`
      SELECT date_trunc('day', "createdAt") as day,
             COUNT(*)::int as count
      FROM "AuditLog"
      ${whereClause}
      GROUP BY day
      ORDER BY day ASC
    `);

    return rows.map((row) => ({
      date: row.day.toISOString(),
      count: Number(row.count) || 0,
    }));
  }

  async organizationHeatmap(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    return this.heatmap(query, organizationId, companyId, {
      excludeGlobalAdmins: true,
    });
  }

  async userHeatmap(
    userId: number,
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    return this.heatmap(
      { ...query, actorId: String(userId) },
      organizationId,
      companyId,
    );
  }

  private async heatmap(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
    options?: { excludeGlobalAdmins?: boolean },
  ) {
    const now = new Date();
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : now;

    const conditions = await this.buildActivityConditions(
      query,
      dateFrom,
      dateTo,
      organizationId,
      companyId,
      options,
    );
    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const rows = await this.prisma.$queryRaw<
      Array<{ dow: number; hour: number; count: number }>
    >(Prisma.sql`
      SELECT EXTRACT(DOW FROM "createdAt")::int as dow,
             EXTRACT(HOUR FROM "createdAt")::int as hour,
             COUNT(*)::int as count
      FROM "AuditLog"
      ${whereClause}
      GROUP BY dow, hour
      ORDER BY dow ASC, hour ASC
    `);

    return rows.map((row) => ({
      dow: Number(row.dow),
      hour: Number(row.hour),
      count: Number(row.count) || 0,
    }));
  }

  async actors(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const where = this.applyTenantScope(
      this.buildWhere(query),
      organizationId,
      companyId,
    );
    const rows = await this.prisma.auditLog.groupBy({
      by: ['actorId', 'actorEmail'],
      _count: { actorId: true },
      where,
      orderBy: { _count: { actorId: 'desc' } },
    });

    const byActor = new Map<
      number,
      { actorId: number; actorEmail: string | null; count: number }
    >();

    rows.forEach((row) => {
      if (typeof row.actorId !== 'number') return;
      const actorId = row.actorId;
      const count = row._count.actorId ?? 0;
      const existing = byActor.get(actorId);
      if (!existing) {
        byActor.set(actorId, {
          actorId,
          actorEmail: row.actorEmail ?? null,
          count,
        });
        return;
      }
      existing.count += count;
      if (!existing.actorEmail && row.actorEmail) {
        existing.actorEmail = row.actorEmail;
      }
    });

    return Array.from(byActor.values()).sort((a, b) => b.count - a.count);
  }

  async ensureUserVisible(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === 'SUPER_ADMIN_GLOBAL') {
      throw new ForbiddenException(
        'El usuario no esta disponible para el resumen por organizacion.',
      );
    }
  }

  private async getGlobalAdminIds(): Promise<number[]> {
    const rows = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN_GLOBAL' },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private applyExcludedActorIds(
    where: Prisma.AuditLogWhereInput,
    actorIds: number[],
  ): Prisma.AuditLogWhereInput {
    if (actorIds.length === 0) return where;
    const existingAnd = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];
    return {
      ...where,
      AND: [...existingAnd, { actorId: { notIn: actorIds } }],
    };
  }

  async searchOrganizationUsers(organizationId: number, q?: string) {
    const searchTerm = q?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        role: { not: 'SUPER_ADMIN_GLOBAL' },
        OR: [
          { organizationId },
          { memberships: { some: { organizationId } } },
        ],
        ...(searchTerm
          ? {
              OR: [
                { username: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: { id: true, username: true, email: true, role: true },
      orderBy: { username: 'asc' },
      distinct: ['id'],
      take: 8,
    });

    return users.map((user) => ({
      actorId: user.id,
      actorEmail: user.username || user.email || null,
      actorRole: user.role,
    }));
  }

  async export(
    query: QueryActivityDto,
    organizationId?: number,
    companyId?: number,
  ) {
    const where = this.applyTenantScope(
      this.buildWhere(query),
      organizationId,
      companyId,
    );
    const orderBy = this.resolveOrderBy(query);
    const items = await this.prisma.auditLog.findMany({
      where,
      orderBy,
    });

    const headers = [
      'fecha',
      'usuario',
      'accion',
      'modulo',
      'resumen',
      'ip',
    ];

    const escape = (value: string | null | undefined) => {
      const raw = value ?? '';
      if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };

    const rows = items.map((item) => [
      item.createdAt.toISOString(),
      escape(item.actorEmail),
      escape(item.action),
      escape(item.entityType),
      escape(item.summary),
      escape(item.ip),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  private resolveOrderBy(
    query: QueryActivityDto,
  ): Prisma.AuditLogOrderByWithRelationInput {
    const sortDir: Prisma.SortOrder =
      query.sortDir && query.sortDir.toLowerCase() === 'asc' ? 'asc' : 'desc';
    switch ((query.sortBy ?? '').toLowerCase()) {
      case 'user':
      case 'usuario':
      case 'actor':
      case 'actoremail':
        return { actorEmail: sortDir };
      case 'action':
      case 'accion':
        return { action: sortDir };
      case 'entity':
      case 'entidad':
      case 'module':
      case 'modulo':
        return { entityType: sortDir };
      default:
        return { createdAt: sortDir };
    }
  }

  private resolveSeverityActions(severity?: string): AuditAction[] | null {
    if (!severity) return null;
    const normalized = severity.trim().toUpperCase();
    if (normalized === 'HIGH') return [AuditAction.DELETED];
    if (normalized === 'MEDIUM')
      return [AuditAction.CREATED, AuditAction.UPDATED];
    if (normalized === 'LOW')
      return [AuditAction.LOGIN, AuditAction.LOGOUT, AuditAction.OTHER];
    return null;
  }

  private async buildActivityConditions(
    query: QueryActivityDto,
    dateFrom: Date,
    dateTo: Date,
    organizationId?: number,
    companyId?: number,
    options?: { excludeGlobalAdmins?: boolean },
  ): Promise<Prisma.Sql[]> {
    const excludedActorIds = options?.excludeGlobalAdmins
      ? await this.getGlobalAdminIds()
      : [];
    const conditions: Prisma.Sql[] = [
      Prisma.sql`"createdAt" >= ${dateFrom}`,
      Prisma.sql`"createdAt" <= ${dateTo}`,
    ];

    if (query.actorId) {
      const actorId = Number(query.actorId);
      if (Number.isFinite(actorId)) {
        conditions.push(Prisma.sql`"actorId" = ${actorId}`);
      }
    }

    if (excludedActorIds.length > 0) {
      conditions.push(
        Prisma.sql`"actorId" NOT IN (${Prisma.join(excludedActorIds)})`,
      );
    }

    if (query.entityType) {
      conditions.push(Prisma.sql`"entityType" = ${query.entityType}`);
    }

    if (organizationId !== undefined) {
      conditions.push(Prisma.sql`"organizationId" = ${organizationId}`);
    }

    if (companyId !== undefined) {
      conditions.push(Prisma.sql`"companyId" = ${companyId}`);
    }

    const severityActions = this.resolveSeverityActions(query.severity);
    if (query.action) {
      conditions.push(Prisma.sql`"action" = ${query.action as AuditAction}`);
    } else if (severityActions) {
      conditions.push(Prisma.sql`"action" IN (${Prisma.join(severityActions)})`);
    }

    if (query.excludeContextUpdates) {
      conditions.push(
        Prisma.sql`NOT ("summary" ILIKE ${'%actualizo el contexto%'} OR "summary" ILIKE ${'%actualiz?~ el contexto%'} OR "summary" ILIKE ${'%contexto a org%'})`,
      );
    }

    return conditions;
  }

  private buildWhere(query: QueryActivityDto): Prisma.AuditLogWhereInput {
    const {
      q,
      actorId,
      entityType,
      action,
      dateFrom,
      dateTo,
      excludeContextUpdates,
      severity,
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

    if (action) {
      where.action = action as AuditAction;
    } else {
      const severityActions = this.resolveSeverityActions(severity);
      if (severityActions) {
        where.action = { in: severityActions };
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (excludeContextUpdates) {
      const excludeNeedles = [
        'actualizo el contexto',
        'actualiz?~ el contexto',
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

    return where;
  }

  private applyTenantScope(
    where: Prisma.AuditLogWhereInput,
    organizationId?: number,
    companyId?: number,
  ): Prisma.AuditLogWhereInput {
    const scoped: Prisma.AuditLogWhereInput = { ...where };
    if (organizationId !== undefined) {
      scoped.organizationId = organizationId;
    }
    if (companyId !== undefined) {
      scoped.companyId = companyId;
    }
    return scoped;
  }
}
