import { Module } from '@nestjs/common';
import { ProductofeaturesController } from './productofeatures.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductfeaturesService } from './productofeatures.service';

@Module({
  controllers: [ProductofeaturesController],
  providers: [ProductfeaturesService, PrismaService],
  exports: [ProductfeaturesService],
})
export class ProductofeaturesModule {}
