import { IsNumber, IsString } from 'class-validator';

export class SaleFulfilledDto {
  @IsNumber()
  saleId!: number;

  @IsString()
  timestamp!: string;
}
