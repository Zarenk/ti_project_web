import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/users/jwt-auth.guard';

import { TenantContextService } from './tenant-context.service';
import { TenancyService, TenantSelectionSummary } from './tenancy.service';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('tenancy/current')
export class TenantCurrentController {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  @Get()
  async getCurrentTenant(
    @Req() request: Request,
  ): Promise<TenantSelectionSummary> {
    const context = this.tenantContextService.getContextWithFallback();
    (request as any).tenantContext = context;
    return this.tenancyService.resolveTenantSelection(context);
  }
}
