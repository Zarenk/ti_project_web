import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryPublicController } from './inventory-public.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { InvoiceTemplatesModule } from 'src/invoice-templates/invoice-templates.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { SiteSettingsModule } from 'src/site-settings/site-settings.module';
import { InventoryMetricsController } from './metrics.controller';

@Module({
  imports: [
    ActivityModule,
    InvoiceTemplatesModule,
    TenancyModule,
    SiteSettingsModule,
  ],
  controllers: [
    InventoryController,
    InventoryMetricsController,
    InventoryPublicController,
  ],
  providers: [InventoryService, PrismaService, AccountingHook],
  exports: [InventoryService],
})
export class InventoryModule {}
