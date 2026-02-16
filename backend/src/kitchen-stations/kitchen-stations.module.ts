import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { KitchenStationsController } from './kitchen-stations.controller';
import { KitchenStationsService } from './kitchen-stations.service';

@Module({
  controllers: [KitchenStationsController],
  providers: [KitchenStationsService, PrismaService],
})
export class KitchenStationsModule {}
