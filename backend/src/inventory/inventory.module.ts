import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService],
  exports: [InventoryService],
})
export class InventoryModule {}
