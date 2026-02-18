import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsPublicController } from './products-public.controller';
import { MenuPublicController } from './menu-public.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BrandsService } from 'src/brands/brands.service';
import { ActivityModule } from 'src/activity/activity.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { CategoryModule } from 'src/category/category.module';
import { EntriesModule } from 'src/entries/entries.module';

@Module({
  imports: [ActivityModule, TenancyModule, CategoryModule, PrismaModule, EntriesModule],
  controllers: [ProductsController, ProductsPublicController, MenuPublicController],
  providers: [ProductsService, BrandsService],
  exports: [ProductsService],
})
export class ProductsModule {}
