import { Module } from '@nestjs/common';
import { BarcodeGateway } from './barcode.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BarcodeGateway],
})
export class BarcodeModule {}
