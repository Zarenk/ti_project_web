import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SaleDetailDto {
  @IsNumber()
  @IsPositive()
  productId!: number;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @IsPositive()
  price!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  series?: string[];
}

class PaymentDto {
  @IsNumber()
  @IsPositive()
  paymentMethodId!: number;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  currency!: string;
}

export class CreateSaleDto {
  @IsNumber()
  @IsPositive()
  userId!: number;

  @IsNumber()
  @IsPositive()
  storeId!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  clientId?: number;

  @IsNumber()
  total!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleDetailDto)
  details!: SaleDetailDto[];

  @IsOptional()
  @IsString()
  tipoComprobante?: string;

  @IsString()
  tipoMoneda!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments!: PaymentDto[];

  @IsOptional()
  @IsIn(['POS', 'WEB'])
  source?: 'POS' | 'WEB';
}