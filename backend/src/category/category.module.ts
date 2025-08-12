import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [CategoryController],
  providers: [CategoryService, PrismaService],
  exports: [CategoryService], // Exporta CategoryService
})
export class CategoryModule {}
