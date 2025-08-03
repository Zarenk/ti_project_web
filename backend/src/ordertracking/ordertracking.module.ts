import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderTrackingService } from './ordertracking.service';
import { OrderTrackingController } from './ordertracking.controller';

@Module({
  controllers: [OrderTrackingController],
  providers: [OrderTrackingService, PrismaService],
})
export class OrdertrackingModule {}
