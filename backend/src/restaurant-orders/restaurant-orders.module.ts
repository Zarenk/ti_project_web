import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  RestaurantOrderItemsController,
  RestaurantOrdersController,
} from './restaurant-orders.controller';
import { RestaurantOrdersService } from './restaurant-orders.service';

@Module({
  controllers: [RestaurantOrdersController, RestaurantOrderItemsController],
  providers: [RestaurantOrdersService, PrismaService],
  exports: [RestaurantOrdersService],
})
export class RestaurantOrdersModule {}
