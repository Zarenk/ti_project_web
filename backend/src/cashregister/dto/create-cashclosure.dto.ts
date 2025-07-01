import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCashClosureDto {
  @IsNotEmpty()
  @IsNumber()
  cashRegisterId!: number;

  @IsNotEmpty()
  @IsNumber()
  userId!: number;

  @IsNotEmpty()
  @IsNumber()
  openingBalance!: number;

  @IsNotEmpty()
  @IsNumber()
  closingBalance!: number;

  @IsNotEmpty()
  @IsNumber()
  totalIncome!: number;

  @IsNotEmpty()
  @IsNumber()
  totalExpense!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}