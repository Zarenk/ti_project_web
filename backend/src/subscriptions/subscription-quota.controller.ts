import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import { SubscriptionQuotaService } from './subscription-quota.service';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionQuotaController {
  constructor(
    private readonly quotaService: SubscriptionQuotaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Get('me/summary')
  async getSummary() {
    const orgId = this.tenantContext.getContext().organizationId;
    if (orgId === null) {
      throw new Error(
        'No se puede resolver la organización actual para el usuario autenticado.',
      );
    }
    return this.quotaService.getSummaryByOrganization(orgId);
  }
}
