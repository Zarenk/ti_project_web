import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [SalesController],
  providers: [SalesService, PrismaService],
})
export class SalesModule {}
