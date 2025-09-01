import { IsNumber, IsString } from 'class-validator';

export class InventoryAdjustedDto {
  @IsNumber()
  productId!: number;

  @IsNumber()
  adjustment!: number;
  
  @IsString()
  counterAccount!: string;

  @IsString()
  description!: string;
  
  @IsString()
  timestamp!: string;
}