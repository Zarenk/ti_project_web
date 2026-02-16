import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantContextGuard } from 'src/tenancy/tenant-context.guard';
import type { TenantContext } from 'src/tenancy/tenant-context.interface';
import { InvoiceTemplatesAlertsService } from './alerts.service';

interface RequestWithTenant extends Request {
  tenantContext?: TenantContext;
  user?: {
    id?: number;
    sub?: number;
  };
}

@Controller('inventory-alerts')
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class InvoiceTemplatesAlertsController {
  constructor(private readonly alertsService: InvoiceTemplatesAlertsService) {}

  @Get()
  getAlerts(@Req() req: RequestWithTenant) {
    const context = req.tenantContext;
    return this.alertsService.getAlerts(
      context?.organizationId ?? null,
      context?.companyId ?? null,
    );
  }

  @Get('summary')
  getAlertsSummary(@Req() req: RequestWithTenant) {
    const context = req.tenantContext;
    return this.alertsService.getAlertSummary(
      context?.organizationId ?? null,
      context?.companyId ?? null,
    );
  }

  @Get('events')
  getAlertEvents(
    @Req() req: RequestWithTenant,
    @Query()
    query: {
      alertType?: string | string[];
      status?: string | string[];
      severity?: string | string[];
      from?: string;
      to?: string;
      search?: string;
      limit?: string;
    },
  ) {
    const context = req.tenantContext;
    const parseArray = (value?: string | string[]) => {
      if (!value) {
        return undefined;
      }
      const normalized = Array.isArray(value) ? value : value.split(',');
      const result = normalized
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      return result.length > 0 ? result : undefined;
    };
    const limit =
      typeof query.limit === 'string'
        ? Number(query.limit) || undefined
        : undefined;
    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;
    return this.alertsService.getAlertEvents(
      context?.organizationId ?? null,
      context?.companyId ?? null,
      {
        alertTypes: parseArray(query.alertType),
        statuses: parseArray(query.status),
        severities: parseArray(query.severity),
        from:
          fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
        to: toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined,
        search: query.search?.trim() ?? undefined,
        limit,
      },
    );
  }

  @Post('template/:templateId/review')
  reviewTemplateAlert(
    @Req() req: RequestWithTenant,
    @Param('templateId', ParseIntPipe) templateId: number,
  ) {
    const context = req.tenantContext;
    const userId =
      typeof req.user?.id === 'number'
        ? req.user?.id
        : typeof req.user?.sub === 'number'
          ? req.user?.sub
          : null;
    return this.alertsService.markTemplateReviewed({
      templateId,
      organizationId: context?.organizationId ?? null,
      companyId: context?.companyId ?? null,
      userId,
    });
  }
}
