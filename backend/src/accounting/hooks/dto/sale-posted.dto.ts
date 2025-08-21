import { IsNumber, IsString } from 'class-validator';

export class SalePostedDto {
  @IsNumber()
  saleId!: number;

  @IsString()
  timestamp!: string;
}