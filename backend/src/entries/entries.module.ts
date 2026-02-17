import { Module } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryModule } from 'src/category/category.module';
import { ActivityModule } from 'src/activity/activity.module';
import { AccountingHook } from 'src/accounting/hooks/accounting-hook.service';
import { AccountingService } from 'src/accounting/accounting.service';
import { JournalEntryService } from 'src/accounting/services/journal-entry.service';
import { AccountBootstrapService } from 'src/accounting/services/account-bootstrap.service';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { InvoiceExtractionModule } from 'src/invoice-extraction/invoice-extraction.module';

@Module({
  imports: [
    CategoryModule,
    ActivityModule,
    TenancyModule,
    InvoiceExtractionModule,
  ],
  controllers: [EntriesController],
  providers: [
    EntriesService,
    PrismaService,
    AccountingHook,
    AccountingService,
    JournalEntryService,
    AccountBootstrapService,
  ],
})
export class EntriesModule {}
