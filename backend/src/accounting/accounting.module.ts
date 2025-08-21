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

@Module({
  controllers: [
    AccountingController,
    SalePostedController,
    SaleFulfilledController,
    PurchasePostedController,
    PaymentPostedController,
    InventoryAdjustedController,
    CreditNotePostedController,
    DebitNotePostedController,
  ],
  providers: [AccountingService],
})
export class AccountingModule {}