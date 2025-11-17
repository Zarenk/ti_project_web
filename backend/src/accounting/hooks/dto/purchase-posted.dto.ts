import { IsNumber, IsString } from 'class-validator';

export class PurchasePostedDto {
  @IsNumber()
  purchaseId!: number;

  @IsString()
  timestamp!: string;
}
