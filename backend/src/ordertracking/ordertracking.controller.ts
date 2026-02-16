import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OrderTrackingService } from './ordertracking.service';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('orders')
@UseGuards(TenantRequiredGuard)
export class OrderTrackingController {
  constructor(private readonly orderTrackingService: OrderTrackingService) {}

  @Get(':code/tracking')
  getTracking(
    @Param('code') code: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.orderTrackingService.findByOrderCode(
      code.trim(),
      organizationId ?? undefined,
    );
  }
}
