import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventoryModule } from 'src/inventory/inventory.module';
import { ActivityModule } from 'src/activity/activity.module';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { SunatModule } from 'src/sunat/sunat.module';
import { SubscriptionQuotaService } from 'src/subscriptions/subscription-quota.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [InventoryModule, ActivityModule, SunatModule, TenancyModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    PrismaService,
    AccountingHook,
    SubscriptionQuotaService,
  ],
})
export class SalesModule {}
