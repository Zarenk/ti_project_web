import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';

@Controller('public/inventory')
@UseGuards(TenantRequiredGuard)
export class InventoryPublicController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('/stores-with-product/:productId')
  async getStoresWithProduct(
    @Param('productId') productId: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.inventoryService.getStoresWithProduct(
      Number(productId),
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }
}
