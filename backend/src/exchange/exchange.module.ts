import { Module } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';
import { ExchangeRateCronService } from './exchange-rate-cron.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from '../activity/activity.module';
import { LookupsModule } from 'src/lookups/lookups.module';

@Module({
  controllers: [ExchangeController],
  providers: [ExchangeService, ExchangeRateCronService, PrismaService],
  imports: [ActivityModule, LookupsModule],
})
export class ExchangeModule {}
