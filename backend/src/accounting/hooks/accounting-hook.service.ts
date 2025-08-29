import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountingHook {
  async postSale(id: number): Promise<void> {
    // Placeholder: in real implementation this would notify accounting module
    return;
  }
}