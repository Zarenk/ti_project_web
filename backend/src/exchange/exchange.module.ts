import { Module } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ExchangeController],
  providers: [ExchangeService, PrismaService],
})
export class ExchangeModule {}
