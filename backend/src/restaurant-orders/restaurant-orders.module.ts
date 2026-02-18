import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { IngredientsModule } from 'src/ingredients/ingredients.module';
import {
  RestaurantOrderItemsController,
  RestaurantOrdersController,
} from './restaurant-orders.controller';
import { RestaurantOrdersService } from './restaurant-orders.service';
import { KitchenGateway } from './kitchen.gateway';

@Module({
  imports: [TenancyModule, IngredientsModule, PrismaModule],
  controllers: [RestaurantOrdersController, RestaurantOrderItemsController],
  providers: [RestaurantOrdersService, PrismaService, KitchenGateway],
  exports: [RestaurantOrdersService, KitchenGateway],
})
export class RestaurantOrdersModule {}
