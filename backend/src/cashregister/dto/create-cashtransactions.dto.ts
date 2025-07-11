import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsPositive, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  method!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;
}

export class CreateCashTransactionDto {
  @IsEnum(['INCOME', 'EXPENSE'])
  type!: 'INCOME' | 'EXPENSE';

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  employee?: string;

  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  cashRegisterId!: number;

  @IsNumber()
  @IsPositive()
  userId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods!: PaymentMethodDto[];
}