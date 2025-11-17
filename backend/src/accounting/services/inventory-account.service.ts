import { Injectable } from '@nestjs/common';
import { EntryLine } from '../entries.service';

interface InventoryAdjustment {
  account: string; // counter account
  description: string;
  amount: number; // positive increase, negative decrease
  inventoryAccount?: string;
  quantity?: number;
}

@Injectable()
export class InventoryAccountingService {
  buildEntryFromAdjustment(adj: InventoryAdjustment): EntryLine[] {
    const amount = Math.abs(adj.amount);
    const inventoryAccount = adj.inventoryAccount ?? '2011';
    return [
      {
        account: inventoryAccount,
        description: adj.description,
        debit: adj.amount > 0 ? amount : 0,
        credit: adj.amount < 0 ? amount : 0,
        quantity: adj.quantity ?? null,
      },
      {
        account: adj.account,
        description: adj.description,
        debit: adj.amount < 0 ? amount : 0,
        credit: adj.amount > 0 ? amount : 0,
        quantity: adj.quantity ?? null,
      },
    ];
  }
}

export { InventoryAdjustment };
