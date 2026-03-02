import { Module } from '@nestjs/common';
import { SunatService } from './sunat.service';
import { SunatController } from './sunat.controller';
import { InvoiceVerificationController } from './invoice-verification.controller';
import { SunatRetryCronService } from './sunat-retry.cron';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';

@Module({
  imports: [TenancyModule],
  controllers: [SunatController, InvoiceVerificationController],
  providers: [SunatService, PrismaService, SunatRetryCronService],
  exports: [SunatService],
})
export class SunatModule {}
