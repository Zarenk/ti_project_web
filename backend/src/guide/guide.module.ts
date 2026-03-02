import { Module } from '@nestjs/common';
import { GuideService } from './guide.service';
import { GuideController } from './guide.controller';
import { GuidePublicController } from './guide-public.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { InventoryModule } from 'src/inventory/inventory.module';

@Module({
  imports: [HttpModule, InventoryModule],
  controllers: [GuideController, GuidePublicController],
  providers: [GuideService, PrismaService],
})
export class GuideModule {}
