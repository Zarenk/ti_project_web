import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';

@Module({
  imports: [ActivityModule],
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService, AccountingHook],
  exports: [InventoryService],
})
export class InventoryModule {}
