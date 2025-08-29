import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventoryModule } from 'src/inventory/inventory.module';
import { ActivityModule } from 'src/activity/activity.module';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';

@Module({
  imports: [InventoryModule, ActivityModule],
  controllers: [SalesController],
  providers: [SalesService, PrismaService, AccountingHook],
})
export class SalesModule {}
