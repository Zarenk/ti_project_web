import { Module } from '@nestjs/common';
import { InvoiceExtractionService } from './invoice-extraction.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { InvoiceExtractionController } from './invoice-extraction.controller';
import { TemplateTrainingService } from './template-training.service';
import { MlExtractionService } from './ml-extraction.service';

@Module({
  imports: [TenancyModule],
  controllers: [InvoiceExtractionController],
  providers: [
    InvoiceExtractionService,
    TemplateTrainingService,
    MlExtractionService,
    PrismaService,
  ],
  exports: [InvoiceExtractionService],
})
export class InvoiceExtractionModule {}
