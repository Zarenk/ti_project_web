import { Module } from '@nestjs/common';
import { InvoiceExtractionService } from './invoice-extraction.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { InvoiceExtractionController } from './invoice-extraction.controller';
import { TemplateTrainingService } from './template-training.service';
import { MlExtractionService } from './ml-extraction.service';
import { SubscriptionQuotaService } from 'src/subscriptions/subscription-quota.service';

@Module({
  imports: [TenancyModule],
  controllers: [InvoiceExtractionController],
  providers: [
    InvoiceExtractionService,
    TemplateTrainingService,
    MlExtractionService,
    PrismaService,
    SubscriptionQuotaService,
  ],
  exports: [InvoiceExtractionService],
})
export class InvoiceExtractionModule {}
