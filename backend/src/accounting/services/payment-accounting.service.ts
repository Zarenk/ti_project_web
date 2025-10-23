import { Injectable } from '@nestjs/common';
import { EntryLine } from '../entries.service';

export interface PaymentEntryLine extends EntryLine {}

interface PaymentData {
  amount: number;
  sale?: { client?: { name?: string } } | null;
}

@Injectable()
export class PaymentAccountingService {
  buildEntryFromPayment(payment: PaymentData): PaymentEntryLine[] {
    return [
      {
        account: '1011',
        description: 'Caja',
        debit: payment.amount,
        credit: 0,
      },
      {
        account: '1212',
        description:
          `Cuentas por cobrar ${payment.sale?.client?.name ?? ''}`.trim(),
        debit: 0,
        credit: payment.amount,
      },
    ];
  }
}

export { PaymentData };
