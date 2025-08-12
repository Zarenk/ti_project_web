import { Module } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  controllers: [ExchangeController],
  providers: [ExchangeService, PrismaService],
  imports: [ActivityModule],
})
export class ExchangeModule {}
