import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { RecipeItemsController } from './recipe-items.controller';
import { RecipeItemsService } from './recipe-items.service';

@Module({
  imports: [TenancyModule],
  controllers: [RecipeItemsController],
  providers: [RecipeItemsService, PrismaService],
})
export class RecipeItemsModule {}
