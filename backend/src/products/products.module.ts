import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsPublicController } from './products-public.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { BrandsService } from 'src/brands/brands.service';
import { ActivityModule } from 'src/activity/activity.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { CategoryModule } from 'src/category/category.module';

@Module({
  imports: [ActivityModule, TenancyModule, CategoryModule],
  controllers: [ProductsController, ProductsPublicController],
  providers: [ProductsService, PrismaService, BrandsService],
  exports: [ProductsService], // 👈 IMPORTANTE: exportarlo
})
export class ProductsModule {}
