import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IngredientsController } from './ingredients.controller';
import { IngredientsService } from './ingredients.service';

@Module({
  controllers: [IngredientsController],
  providers: [IngredientsService, PrismaService],
  exports: [IngredientsService],
})
export class IngredientsModule {}
