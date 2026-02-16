import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { CategoryPublicController } from './category-public.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [ActivityModule, TenancyModule],
  controllers: [CategoryController, CategoryPublicController],
  providers: [CategoryService, PrismaService],
  exports: [CategoryService], // Exporta CategoryService
})
export class CategoryModule {}
