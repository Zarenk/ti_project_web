import { Module } from '@nestjs/common';
import { CreditNotePostedController } from './hooks/credit-note-posted.controller';
import { DebitNotePostedController } from './hooks/debit-note-posted.controller';
import { InventoryAdjustedController } from './hooks/invetory-adjusted.controller';
import { PaymentPostedController } from './hooks/payment-posted.controller';
import { PurchasePostedController } from './hooks/purchase-posted.controller';
import { SaleFulfilledController } from './hooks/sale-fulfilled.controller';
import { SalePostedController } from './hooks/sale-posted.controller';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { EntriesRepository } from './services/entries.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SaleAccountingService } from './services/sale-accounting.service';
import { PurchaseAccountingService } from './services/purchase-account.service';
import { InventoryAccountingService } from './services/inventory-account.service';
import { PaymentAccountingService } from './services/payment-accounting.service';
import { DebitNoteAccountingService } from './services/debit-note-accounting.service';
import { CreditNoteAccountingService } from './services/credit-note-accounting.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AccountingController,
    SalePostedController,
    SaleFulfilledController,
    PurchasePostedController,
    PaymentPostedController,
    InventoryAdjustedController,
    CreditNotePostedController,
    DebitNotePostedController,
    EntriesController,
  ],
  providers: [
    AccountingService,
    EntriesService,
    EntriesRepository,
    SaleAccountingService,
    PurchaseAccountingService,
    InventoryAccountingService,
    PaymentAccountingService,
    DebitNoteAccountingService,
    {
      provide: 'CreditNoteAccountingService',
      useClass: CreditNoteAccountingService,
    },
  ],
})
export class AccountingModule {}
