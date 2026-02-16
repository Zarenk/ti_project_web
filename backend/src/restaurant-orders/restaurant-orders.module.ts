import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import {
  RestaurantOrderItemsController,
  RestaurantOrdersController,
} from './restaurant-orders.controller';
import { RestaurantOrdersService } from './restaurant-orders.service';

@Module({
  imports: [TenancyModule],
  controllers: [RestaurantOrdersController, RestaurantOrderItemsController],
  providers: [RestaurantOrdersService, PrismaService],
  exports: [RestaurantOrdersService],
})
export class RestaurantOrdersModule {}
