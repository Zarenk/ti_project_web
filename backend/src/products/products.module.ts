import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService, CategoryService],
  exports: [ProductsService], // 👈 IMPORTANTE: exportarlo
})
export class ProductsModule {}
