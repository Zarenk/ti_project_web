import { Module } from '@nestjs/common';
import { WebSalesService } from './websales.service';
import { WebSalesController } from './websales.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { InventoryModule } from 'src/inventory/inventory.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [ActivityModule, InventoryModule, TenancyModule],
  controllers: [WebSalesController],
  providers: [WebSalesService, PrismaService, AccountingHook],
})
export class WebsalesModule {}
