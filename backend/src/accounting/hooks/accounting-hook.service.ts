import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AccountingHook {
  private readonly logger = new Logger(AccountingHook.name);

  async postSale(id: number): Promise<void> {
    const payload = {
      saleId: id,
      timestamp: new Date().toISOString(),
    };

    const baseUrl = process.env.ACCOUNTING_URL || 'http://localhost:3000';
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
}