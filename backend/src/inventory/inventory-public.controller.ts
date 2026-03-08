import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
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

  /** Batch stock lookup: GET /public/inventory/batch-stock?ids=1,2,3 */
  @Get('/batch-stock')
  async getBatchStock(
    @Query('ids') ids: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const productIds = (ids ?? '')
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
    return this.inventoryService.getBatchStock(
      productIds,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }
}
