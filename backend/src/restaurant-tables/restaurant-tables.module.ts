import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RestaurantTablesController } from './restaurant-tables.controller';
import { RestaurantTablesService } from './restaurant-tables.service';

@Module({
  controllers: [RestaurantTablesController],
  providers: [RestaurantTablesService, PrismaService],
})
export class RestaurantTablesModule {}
