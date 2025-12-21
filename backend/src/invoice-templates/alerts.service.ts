import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InvoiceTemplatesAlertsService {
  private readonly logger = new Logger(InvoiceTemplatesAlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private extractConfidenceFromResult(
    payload: Prisma.JsonValue | null,
  ): number | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const data = payload as Record<string, unknown>;
    const directCandidate = data.mlConfidence ?? data.confidence;
    const nestedCandidate =
      typeof data.ml === 'object' && data.ml
        ? (data.ml as Record<string, unknown>).confidence
        : undefined;
    const candidates = [directCandidate, nestedCandidate];
    for (const value of candidates) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private buildSampleWhere(
    organizationId: number | null,
    companyId: number | null,
  ): Prisma.InvoiceSampleWhereInput | undefined {
    const filters: Prisma.InvoiceSampleWhereInput = {};
    if (organizationId !== null) {
      filters.organizationId = organizationId;
    }
    if (companyId !== null) {
      filters.companyId = companyId;
    }
    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  private buildTemplateWhere(
    organizationId: number | null,
    companyId: number | null,
    updatedBefore?: Date,
  ): Prisma.InvoiceTemplateWhereInput {
    const filters: Prisma.InvoiceTemplateWhereInput = {};
    if (updatedBefore) {
      filters.updatedAt = { lt: updatedBefore };
    }
    if (organizationId !== null) {
      filters.organizationId = organizationId;
    }
    if (companyId !== null) {
      filters.companyId = companyId;
    }
    return filters;
  }

  private buildAlertFilter(
    organizationId: number | null,
    companyId: number | null,
    alertType?: string,
    status?: string,
  ): Prisma.MonitoringAlertWhereInput {
    const filters: Prisma.MonitoringAlertWhereInput = {};
    if (organizationId !== null) {
      filters.organizationId = organizationId;
    }
    if (companyId !== null) {
      filters.companyId = companyId;
    }
    if (alertType) {
      filters.alertType = alertType;
    }
    if (status) {
      filters.status = status;
    }
    return filters;
  }

  private buildEventFilter(
    organizationId: number | null,
    companyId: number | null,
    alertTypes?: string[],
  ): Prisma.MonitoringAlertEventWhereInput {
    const filters: Prisma.MonitoringAlertEventWhereInput = {};
    if (organizationId !== null) {
      filters.organizationId = organizationId;
    }
    if (companyId !== null) {
      filters.companyId = companyId;
    }
    if (alertTypes && alertTypes.length > 0) {
      filters.alertType = { in: alertTypes };
    }
    return filters;
  }

  async getAlertEvents(
    organizationId: number | null,
    companyId: number | null,
    options: {
      alertTypes?: string[];
      statuses?: string[];
      severities?: string[];
      from?: Date;
      to?: Date;
      search?: string;
      limit?: number;
    } = {},
  ) {
    const where = this.buildEventFilter(
      organizationId,
      companyId,
      options.alertTypes,
    );
    if (options.statuses?.length) {
      where.status = { in: options.statuses };
    }
    if (options.severities?.length) {
      where.severity = { in: options.severities };
    }
    if (options.search) {
      where.message = { contains: options.search, mode: 'insensitive' };
    }
    if (options.from || options.to) {
      where.createdAt = {};
      if (options.from) {
        where.createdAt.gte = options.from;
      }
      if (options.to) {
        where.createdAt.lte = options.to;
      }
    }

    return this.prisma.monitoringAlertEvent.findMany({
      where,
      include: {
        alert: {
          select: {
            providerName: true,
            alertType: true,
            status: true,
            entityType: true,
            entityId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(options.limit ?? 50, 200),
    });
  }

  private async recordAlertEvent(data: {
    alertId?: number | null;
    organizationId: number | null;
    companyId: number | null;
    alertType: string;
    status: string;
    severity?: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.prisma.monitoringAlertEvent.create({
      data: {
        alertId: data.alertId ?? null,
        organizationId: data.organizationId ?? null,
        companyId: data.companyId ?? null,
        alertType: data.alertType,
        status: data.status,
        severity: data.severity ?? 'INFO',
        message: data.message,
        metadata:
          data.metadata === undefined
            ? undefined
            : (data.metadata as Prisma.InputJsonValue),
      },
    });
  }

  private buildIdentifier(parts: {
    organizationId: number | null;
    companyId: number | null;
    alertType: string;
    providerName?: string | null;
    entityType?: string | null;
    entityId?: number | null;
  }): string {
    const org = parts.organizationId ?? 'none';
    const company = parts.companyId ?? 'none';
    const provider = parts.providerName ?? 'any';
    const entityType = parts.entityType ?? 'general';
    const entityId = parts.entityId ?? 'none';
    return `${org}:${company}:${parts.alertType}:${provider}:${entityType}:${entityId}`;
  }

  async getAlerts(organizationId: number | null, companyId: number | null) {
    const reviewDays = Number(process.env.INVOICE_REVIEW_DAYS ?? 30);
    const thresholdDate = new Date(
      Date.now() - reviewDays * 24 * 60 * 60 * 1000,
    );
    const reviewDue = await this.prisma.invoiceTemplate.findMany({
      where: {
        updatedAt: { lt: thresholdDate },
        isActive: true,
        ...(organizationId !== null ? { organizationId } : {}),
        ...(companyId !== null ? { companyId } : {}),
      },
      select: {
        id: true,
        documentType: true,
        providerName: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: 5,
    });

    const eventsLimit = Number(
      process.env.INVOICE_ALERT_RECENT_EVENTS_LIMIT ?? 10,
    );
    const recentEvents = await this.prisma.monitoringAlertEvent.findMany({
      where: this.buildEventFilter(organizationId, companyId),
      orderBy: { createdAt: 'desc' },
      take: eventsLimit,
      include: {
        alert: {
          select: {
            providerName: true,
            entityType: true,
            entityId: true,
          },
        },
      },
    });

    const failureEvents = recentEvents.filter((event) =>
      ['PROVIDER_FAILURE', 'CONFIDENCE_DROP'].includes(event.alertType),
    );

    return {
      failureAlerts: failureEvents.map((event) => ({
        id: event.id,
        alertType: event.alertType,
        status: event.status,
        severity: event.severity,
        message: event.message,
        providerName:
          event.alert?.providerName ??
          ((event.metadata as Record<string, unknown> | null | undefined)
            ?.providerName as string | undefined) ??
          null,
        metadata: event.metadata,
        createdAt: event.createdAt,
      })),
      reviewDueTemplates: reviewDue,
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        alertType: event.alertType,
        status: event.status,
        severity: event.severity,
        message: event.message,
        metadata: event.metadata,
        createdAt: event.createdAt,
      })),
    };
  }

  async getAlertSummary(
    organizationId: number | null,
    companyId: number | null,
  ) {
    const providerAlerts = await this.prisma.monitoringAlert.findMany({
      where: {
        ...this.buildAlertFilter(
          organizationId,
          companyId,
          'PROVIDER_FAILURE',
          'ACTIVE',
        ),
      },
      orderBy: { lastFailureAt: 'desc' },
    });

    const reviewDueCount = await this.prisma.monitoringAlert.count({
      where: {
        ...this.buildAlertFilter(
          organizationId,
          companyId,
          'TEMPLATE_REVIEW',
          'ACTIVE',
        ),
      },
    });

    return {
      providersOverThreshold: providerAlerts.map((alert) => ({
        provider: alert.providerName ?? 'general',
        failureCount: alert.failureCount,
        lastFailureAt: alert.lastFailureAt ?? alert.updatedAt,
      })),
      reviewDueCount,
      badgeCount: providerAlerts.length + reviewDueCount,
    };
  }

  async runMonitoringCycle(): Promise<void> {
    this.logger.debug('Running inventory alerts monitoring cycle');
    await this.syncProviderFailureAlerts();
    await this.syncTemplateReviewAlerts();
    await this.syncConfidenceDropAlerts();
  }

  private async syncProviderFailureAlerts(): Promise<void> {
    const failureThreshold = Number(
      process.env.INVOICE_ALERT_FAILURE_THRESHOLD ?? 3,
    );
    const lookbackHours = Number(
      process.env.INVOICE_ALERT_FAILURE_LOOKBACK_HOURS ?? 72,
    );
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const recentLogs = await this.prisma.invoiceExtractionLog.findMany({
      where: {
        level: { in: ['ERROR', 'WARN'] },
        createdAt: { gte: since },
      },
      include: {
        sample: {
          include: {
            template: true,
          },
        },
      },
    });

    const grouped = new Map<
      string,
      {
        organizationId: number | null;
        companyId: number | null;
        providerName: string;
        count: number;
        lastFailureAt: Date;
      }
    >();

    for (const log of recentLogs) {
      if (!log.sample) {
        continue;
      }
      const providerName =
        log.sample.template?.providerName ??
        log.sample.template?.documentType ??
        'general';
      const key = `${log.sample.organizationId ?? 'none'}:${
        log.sample.companyId ?? 'none'
      }:${providerName}`;
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, {
          organizationId: log.sample.organizationId ?? null,
          companyId: log.sample.companyId ?? null,
          providerName,
          count: 1,
          lastFailureAt: log.createdAt,
        });
      } else {
        current.count += 1;
        if (log.createdAt > current.lastFailureAt) {
          current.lastFailureAt = log.createdAt;
        }
      }
    }

    const activeKeys = new Set<string>();
    for (const group of grouped.values()) {
      if (group.count < failureThreshold) {
        continue;
      }
      const identifier = this.buildIdentifier({
        organizationId: group.organizationId,
        companyId: group.companyId,
        alertType: 'PROVIDER_FAILURE',
        providerName: group.providerName,
      });
      activeKeys.add(identifier);
      const existing = await this.prisma.monitoringAlert.findUnique({
        where: { identifier },
      });
      const alert = await this.prisma.monitoringAlert.upsert({
        where: { identifier },
        update: {
          status: 'ACTIVE',
          failureCount: group.count,
          lastFailureAt: group.lastFailureAt,
          resolvedAt: null,
          metadata: {
            providerName: group.providerName,
            lookbackHours,
            failureThreshold,
          },
        },
        create: {
          organizationId: group.organizationId,
          companyId: group.companyId,
          alertType: 'PROVIDER_FAILURE',
          providerName: group.providerName,
          status: 'ACTIVE',
          failureCount: group.count,
          lastFailureAt: group.lastFailureAt,
          identifier,
          metadata: {
            providerName: group.providerName,
            lookbackHours,
            failureThreshold,
          },
        },
      });

      const shouldRecordEvent =
        !existing ||
        existing.failureCount !== alert.failureCount ||
        (existing.lastFailureAt?.getTime() ?? 0) !==
          (alert.lastFailureAt?.getTime() ?? 0);

      if (shouldRecordEvent) {
        await this.recordAlertEvent({
          alertId: alert.id,
          organizationId: alert.organizationId ?? null,
          companyId: alert.companyId ?? null,
          alertType: 'PROVIDER_FAILURE',
          status: 'ACTIVE',
          severity: 'WARN',
          message: `El proveedor ${
            group.providerName
          } registró ${group.count} fallos en las últimas ${lookbackHours}h.`,
          metadata: {
            providerName: group.providerName,
            failureCount: group.count,
            lastFailureAt: group.lastFailureAt?.toISOString(),
            lookbackHours,
            failureThreshold,
          },
        });
      }
    }

    const activeAlerts = await this.prisma.monitoringAlert.findMany({
      where: { alertType: 'PROVIDER_FAILURE', status: 'ACTIVE' },
    });
    for (const alert of activeAlerts) {
      if (!activeKeys.has(alert.identifier)) {
        const resolved = await this.prisma.monitoringAlert.update({
          where: { id: alert.id },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        await this.recordAlertEvent({
          alertId: resolved.id,
          organizationId: resolved.organizationId ?? null,
          companyId: resolved.companyId ?? null,
          alertType: 'PROVIDER_FAILURE',
          status: 'RESOLVED',
          message: `Restablecida la alerta del proveedor ${
            alert.providerName ?? 'general'
          }`,
          metadata: {
            providerName: alert.providerName,
            resolvedAt: resolved.resolvedAt?.toISOString(),
          },
        });
      }
    }
  }

  private async syncTemplateReviewAlerts(): Promise<void> {
    const reviewDays = Number(process.env.INVOICE_REVIEW_DAYS ?? 30);
    const thresholdDate = new Date(
      Date.now() - reviewDays * 24 * 60 * 60 * 1000,
    );
    const templates = await this.prisma.invoiceTemplate.findMany({
      where: {
        updatedAt: { lt: thresholdDate },
        isActive: true,
      },
      select: {
        id: true,
        organizationId: true,
        companyId: true,
        providerName: true,
        documentType: true,
        updatedAt: true,
      },
    });

    const activeTemplateKeys = new Set<string>();
    for (const template of templates) {
      const identifier = this.buildIdentifier({
        organizationId: template.organizationId ?? null,
        companyId: template.companyId ?? null,
        alertType: 'TEMPLATE_REVIEW',
        entityType: 'template',
        entityId: template.id,
      });
      activeTemplateKeys.add(identifier);
      const existing = await this.prisma.monitoringAlert.findUnique({
        where: { identifier },
      });
      const alert = await this.prisma.monitoringAlert.upsert({
        where: { identifier },
        update: {
          status: 'ACTIVE',
          resolvedAt: null,
          metadata: {
            documentType: template.documentType,
            providerName: template.providerName,
            lastUpdatedAt: template.updatedAt,
          },
        },
        create: {
          organizationId: template.organizationId ?? null,
          companyId: template.companyId ?? null,
          alertType: 'TEMPLATE_REVIEW',
          entityType: 'template',
          entityId: template.id,
          providerName: template.providerName,
          status: 'ACTIVE',
          identifier,
          metadata: {
            documentType: template.documentType,
            providerName: template.providerName,
            lastUpdatedAt: template.updatedAt,
          },
        },
      });

      if (!existing) {
        await this.recordAlertEvent({
          alertId: alert.id,
          organizationId: alert.organizationId ?? null,
          companyId: alert.companyId ?? null,
          alertType: 'TEMPLATE_REVIEW',
          status: 'ACTIVE',
          severity: 'INFO',
          message: `La plantilla ${template.documentType} requiere revisión.`,
          metadata: {
            templateId: template.id,
            providerName: template.providerName,
            lastUpdatedAt: template.updatedAt?.toISOString(),
          },
        });
      }
    }

    const activeReviewAlerts = await this.prisma.monitoringAlert.findMany({
      where: { alertType: 'TEMPLATE_REVIEW', status: 'ACTIVE' },
    });
    for (const alert of activeReviewAlerts) {
      if (!activeTemplateKeys.has(alert.identifier)) {
        const resolved = await this.prisma.monitoringAlert.update({
          where: { id: alert.id },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        await this.recordAlertEvent({
          alertId: resolved.id,
          organizationId: resolved.organizationId ?? null,
          companyId: resolved.companyId ?? null,
          alertType: 'TEMPLATE_REVIEW',
          status: 'RESOLVED',
          message: `Plantilla ${
            alert.metadata
              ? (alert.metadata as Record<string, unknown>).documentType
              : alert.identifier
          } revisada`,
          metadata: {
            resolvedAt: resolved.resolvedAt?.toISOString(),
            templateId: alert.entityId,
            providerName: alert.providerName,
          },
        });
      }
    }
  }

  private async syncConfidenceDropAlerts(): Promise<void> {
    const threshold = Number(process.env.INVOICE_CONFIDENCE_THRESHOLD ?? 0.45);
    const lookbackHours = Number(
      process.env.INVOICE_ALERT_CONFIDENCE_LOOKBACK_HOURS ?? 72,
    );
    const minSamples = Number(
      process.env.INVOICE_ALERT_CONFIDENCE_MIN_SAMPLES ?? 5,
    );
    const minRatio = Number(
      process.env.INVOICE_ALERT_CONFIDENCE_MIN_RATIO ?? 0.6,
    );
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const samples = await this.prisma.invoiceSample.findMany({
      where: {
        createdAt: { gte: since },
        extractionResult: { not: Prisma.JsonNull },
      },
      select: {
        id: true,
        organizationId: true,
        companyId: true,
        invoiceTemplateId: true,
        createdAt: true,
        extractionResult: true,
        template: {
          select: {
            id: true,
            providerName: true,
            documentType: true,
          },
        },
      },
    });

    type ConfidenceBucket = {
      identifier: string;
      organizationId: number | null;
      companyId: number | null;
      templateId: number | null;
      providerName: string | null;
      documentType: string | null;
      total: number;
      low: number;
      latestLowAt: Date | null;
    };

    const grouped = new Map<string, ConfidenceBucket>();

    for (const sample of samples) {
      const confidence = this.extractConfidenceFromResult(
        sample.extractionResult,
      );
      if (confidence === null) {
        continue;
      }
      const providerName =
        sample.template?.providerName ??
        sample.template?.documentType ??
        'general';
      const templateId = sample.invoiceTemplateId ?? null;
      const identifier = this.buildIdentifier({
        organizationId: sample.organizationId ?? null,
        companyId: sample.companyId ?? null,
        alertType: 'CONFIDENCE_DROP',
        providerName,
        entityType: templateId ? 'template' : 'provider',
        entityId: templateId,
      });

      let bucket = grouped.get(identifier);
      if (!bucket) {
        bucket = {
          identifier,
          organizationId: sample.organizationId ?? null,
          companyId: sample.companyId ?? null,
          templateId,
          providerName,
          documentType: sample.template?.documentType ?? null,
          total: 0,
          low: 0,
          latestLowAt: null,
        };
        grouped.set(identifier, bucket);
      }

      bucket.total += 1;
      if (confidence < threshold) {
        bucket.low += 1;
        if (!bucket.latestLowAt || sample.createdAt > bucket.latestLowAt) {
          bucket.latestLowAt = sample.createdAt;
        }
      }
    }

    const activeConfidenceKeys = new Set<string>();
    for (const bucket of grouped.values()) {
      if (bucket.total < minSamples) {
        continue;
      }
      if (bucket.low === 0) {
        continue;
      }
      const ratio = bucket.low / bucket.total;
      if (ratio < minRatio) {
        continue;
      }
      const lastLowAt = bucket.latestLowAt ?? new Date();
      activeConfidenceKeys.add(bucket.identifier);
      const existing = await this.prisma.monitoringAlert.findUnique({
        where: { identifier: bucket.identifier },
      });
      const alert = await this.prisma.monitoringAlert.upsert({
        where: { identifier: bucket.identifier },
        update: {
          status: 'ACTIVE',
          resolvedAt: null,
          failureCount: bucket.low,
          lastFailureAt: lastLowAt,
          metadata: {
            templateId: bucket.templateId,
            providerName: bucket.providerName,
            documentType: bucket.documentType,
            totalSamples: bucket.total,
            lowSamples: bucket.low,
            lowConfidenceRatio: ratio,
            confidenceThreshold: threshold,
            lookbackHours,
          },
        },
        create: {
          organizationId: bucket.organizationId,
          companyId: bucket.companyId,
          alertType: 'CONFIDENCE_DROP',
          providerName: bucket.providerName ?? undefined,
          entityType: bucket.templateId ? 'template' : 'provider',
          entityId: bucket.templateId ?? undefined,
          status: 'ACTIVE',
          failureCount: bucket.low,
          lastFailureAt: lastLowAt,
          identifier: bucket.identifier,
          metadata: {
            templateId: bucket.templateId,
            providerName: bucket.providerName,
            documentType: bucket.documentType,
            totalSamples: bucket.total,
            lowSamples: bucket.low,
            lowConfidenceRatio: ratio,
            confidenceThreshold: threshold,
            lookbackHours,
          },
        },
      });

      const shouldRecordEvent =
        !existing ||
        existing.failureCount !== alert.failureCount ||
        (existing.lastFailureAt?.getTime() ?? 0) !==
          (alert.lastFailureAt?.getTime() ?? 0);

      if (shouldRecordEvent) {
        await this.recordAlertEvent({
          alertId: alert.id,
          organizationId: alert.organizationId ?? null,
          companyId: alert.companyId ?? null,
          alertType: 'CONFIDENCE_DROP',
          status: 'ACTIVE',
          severity: 'WARN',
          message: `Confianza baja (${(ratio * 100).toFixed(1) ?? '0'}%) para ${
            bucket.templateId
              ? `la plantilla ${bucket.documentType ?? bucket.templateId}`
              : `el proveedor ${bucket.providerName ?? 'general'}`
          }.`,
          metadata: {
            templateId: bucket.templateId,
            providerName: bucket.providerName,
            documentType: bucket.documentType,
            lowSamples: bucket.low,
            totalSamples: bucket.total,
            lowConfidenceRatio: ratio,
            lookbackHours,
            confidenceThreshold: threshold,
          },
        });
      }
    }

    const activeConfidenceAlerts = await this.prisma.monitoringAlert.findMany({
      where: { alertType: 'CONFIDENCE_DROP', status: 'ACTIVE' },
    });

    for (const alert of activeConfidenceAlerts) {
      if (!activeConfidenceKeys.has(alert.identifier)) {
        const resolved = await this.prisma.monitoringAlert.update({
          where: { id: alert.id },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        await this.recordAlertEvent({
          alertId: resolved.id,
          organizationId: resolved.organizationId ?? null,
          companyId: resolved.companyId ?? null,
          alertType: 'CONFIDENCE_DROP',
          status: 'RESOLVED',
          message: `Restablecida la confianza de ${
            alert.providerName ?? alert.entityType ?? 'general'
          }`,
          metadata: {
            resolvedAt: resolved.resolvedAt?.toISOString(),
            templateId: alert.entityId,
            providerName: alert.providerName,
          },
        });
      }
    }
  }

  async markTemplateReviewed(params: {
    templateId: number;
    organizationId: number | null;
    companyId: number | null;
    userId: number | null;
  }) {
    const { templateId, organizationId, companyId, userId } = params;
    const template = await this.prisma.invoiceTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        organizationId: true,
        companyId: true,
        documentType: true,
        providerName: true,
      },
    });
    if (!template) {
      throw new NotFoundException('Invoice template not found');
    }
    if (
      (organizationId !== null &&
        template.organizationId !== null &&
        template.organizationId !== organizationId) ||
      (companyId !== null &&
        template.companyId !== null &&
        template.companyId !== companyId)
    ) {
      throw new ForbiddenException('Template does not belong to this tenant');
    }

    const updatedTemplate = await this.prisma.invoiceTemplate.update({
      where: { id: templateId },
      data: {
        updatedAt: new Date(),
        ...(userId
          ? {
              updatedBy: {
                connect: { id: userId },
              },
            }
          : {}),
      },
    });

    const activeAlerts = await this.prisma.monitoringAlert.findMany({
      where: {
        alertType: 'TEMPLATE_REVIEW',
        entityType: 'template',
        entityId: templateId,
        status: 'ACTIVE',
      },
    });

    for (const alert of activeAlerts) {
      const resolved = await this.prisma.monitoringAlert.update({
        where: { id: alert.id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      await this.recordAlertEvent({
        alertId: resolved.id,
        organizationId: resolved.organizationId ?? null,
        companyId: resolved.companyId ?? null,
        alertType: 'TEMPLATE_REVIEW',
        status: 'RESOLVED',
        severity: 'INFO',
        message: `Plantilla ${template.documentType} revisada manualmente`,
        metadata: {
          templateId,
          providerName: template.providerName,
          reviewerUserId: userId,
          resolvedAt: resolved.resolvedAt?.toISOString(),
        },
      });
    }

    return {
      template: updatedTemplate,
      resolvedAlerts: activeAlerts.length,
    };
  }
}
