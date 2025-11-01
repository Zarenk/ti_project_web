import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/users/jwt-auth.guard';

import { CurrentTenant } from './tenant-context.decorator';
import { TenantContext } from './tenant-context.interface';
import { TenantContextGuard } from './tenant-context.guard';
import {
  TenancyService,
  TenantSelectionSummary,
} from './tenancy.service';

@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('tenancy/current')
export class TenantCurrentController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get()
  async getCurrentTenant(
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<TenantSelectionSummary> {
    if (!tenant) {
      return { organization: null, company: null, companies: [] };
    }
    return this.tenancyService.resolveTenantSelection(tenant);
  }
}
