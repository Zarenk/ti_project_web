import { Module } from '@nestjs/common';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';

@Module({
  providers: [TenantContextService, TenantContextGuard],
  exports: [TenantContextService, TenantContextGuard],
})
export class TenancyModule {}