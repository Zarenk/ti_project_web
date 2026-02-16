import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AccountingHook {
  private readonly logger = new Logger(AccountingHook.name);

  private getBaseUrl(): string {
    if (process.env.ACCOUNTING_URL) {
      return process.env.ACCOUNTING_URL;
    }
    const port = process.env.PORT || '4000';
    return `http://localhost:${port}/api`;
  }

  private isHookEnabled(): boolean {
    const flag = process.env.ACCOUNTING_HOOK_ENABLED;
    if (flag === undefined) {
      return true;
    }
    return flag.toLowerCase() === 'true';
  }

  async postSale(id: number): Promise<void> {
    const payload = {
      saleId: id,
      timestamp: new Date().toISOString(),
    };

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/accounting/hooks/sale-posted`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(url, payload);
        return;
      } catch (err) {
        this.logger.error(
          `Failed to post sale ${id} to accounting (attempt ${attempt})`,
          err as any,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw err;
      }
    }
  }

  async postPurchase(id: number): Promise<void> {
    // Toggle por env para evitar duplicados con el asiento local
    const enabled =
      (process.env.ACCOUNTING_HOOK_PURCHASE_ENABLED ?? 'false') === 'true';
    if (!enabled) {
      this.logger.log(`purchase hook disabled; skipping postPurchase(${id})`);
      return;
    }
    const payload = {
      purchaseId: id,
      timestamp: new Date().toISOString(),
    };

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/accounting/hooks/purchase-posted`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(url, payload);
        return;
      } catch (err) {
        this.logger.error(
          `Failed to post purchase ${id} to accounting (attempt ${attempt})`,
          err as any,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw err;
      }
    }
  }

  async postInventoryAdjustment(data: {
    productId: number;
    adjustment: number;
    counterAccount: string;
    description: string;
  }): Promise<void> {
    if (!this.isHookEnabled()) {
      this.logger.debug(
        'Accounting hooks disabled; skipping inventory adjustment notification',
      );
      return;
    }
    const payload = { ...data, timestamp: new Date().toISOString() };
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/accounting/hooks/inventory-adjusted`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(url, payload);
        return;
      } catch (err) {
        this.logger.error(
          `Failed to post inventory adjustment for product ${data.productId} (attempt ${attempt})`,
          err as any,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw err;
      }
    }
  }

  async postPayment(id: number): Promise<void> {
    const payload = {
      paymentId: id,
      timestamp: new Date().toISOString(),
    };

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/accounting/hooks/payment-posted`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(url, payload);
        return;
      } catch (err) {
        this.logger.error(
          `Failed to post payment ${id} to accounting (attempt ${attempt})`,
          err as any,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw err;
      }
    }
  }

  async postCreditNote(id: number): Promise<void> {
    const payload = {
      creditNoteId: id,
      timestamp: new Date().toISOString(),
    };

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/accounting/hooks/credit-note-posted`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(url, payload);
        return;
      } catch (err) {
        this.logger.error(
          `Failed to post credit note ${id} to accounting (attempt ${attempt})`,
          err as any,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw err;
      }
    }
  }

  async postDebitNote(id: number): Promise<void> {
    const payload = {
      debitNoteId: id,
      timestamp: new Date().toISOString(),
    };

    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/accounting/hooks/debit-note-posted`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.post(url, payload);
        return;
      } catch (err) {
        this.logger.error(
          `Failed to post debit note ${id} to accounting (attempt ${attempt})`,
          err as any,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw err;
      }
    }
  }
}
