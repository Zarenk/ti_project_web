import { Module } from '@nestjs/common';
import { BarcodeGateway } from './barcode.gateway';
import { ProductsModule } from 'src/products/products.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [ProductsModule],
  providers: [BarcodeGateway, PrismaService],
})
export class BarcodeModule {}
