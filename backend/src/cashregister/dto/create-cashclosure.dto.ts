import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCashClosureDto {
  @IsNotEmpty()
  @IsNumber()
  storeId!: number;
  
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  nextInitialBalance?: number;
}