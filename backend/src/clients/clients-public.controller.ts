import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { ClientService } from './clients.service';

@Controller('public/clients')
@UseGuards(TenantRequiredGuard)
export class ClientsPublicController {
  constructor(private readonly clientService: ClientService) {}

  @Post('guest')
  @ApiOperation({ summary: 'Create guest client (public)' })
  createGuest(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.clientService.createGuest(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }
}
