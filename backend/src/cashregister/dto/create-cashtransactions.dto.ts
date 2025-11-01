import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
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

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  clientDocument?: string;

  @IsOptional()
  @IsString()
  clientDocumentType?: string;

  @IsOptional()
  @IsNumber()
  organizationId?: number | null;

  @IsOptional()
  @IsNumber()
  companyId?: number | null;
}
