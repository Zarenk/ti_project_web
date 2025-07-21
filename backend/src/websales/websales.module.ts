import { Module } from '@nestjs/common';
import { WebSalesService } from './websales.service';
import { WebSalesController } from './websales.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [WebSalesController],
  providers: [WebSalesService, PrismaService],
})
export class WebsalesModule {}
