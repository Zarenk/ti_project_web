import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RecipeItemsController } from './recipe-items.controller';
import { RecipeItemsService } from './recipe-items.service';

@Module({
  controllers: [RecipeItemsController],
  providers: [RecipeItemsService, PrismaService],
})
export class RecipeItemsModule {}
