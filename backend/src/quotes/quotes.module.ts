import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuotesEmailService } from './quotes-email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [TenancyModule, ConfigModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuotesEmailService, PrismaService],
})
export class QuotesModule {}
