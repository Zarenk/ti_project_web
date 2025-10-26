import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { BrandsService } from 'src/brands/brands.service';
import { ActivityModule } from 'src/activity/activity.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [ActivityModule, TenancyModule],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService, CategoryService, BrandsService],
  exports: [ProductsService], // 👈 IMPORTANTE: exportarlo
})
export class ProductsModule {}
