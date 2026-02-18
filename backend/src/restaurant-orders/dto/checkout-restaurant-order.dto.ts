import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CheckoutPaymentDto {
  @IsNumber()
  paymentMethodId!: number;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class CheckoutRestaurantOrderDto {
  @IsNumber()
  storeId!: number;

  @IsOptional()
  @IsNumber()
  clientId?: number | null;

  @IsOptional()
  @IsIn(['BOLETA', 'FACTURA', 'SIN COMPROBANTE'])
  tipoComprobante?: string;

  @IsOptional()
  @IsString()
  tipoMoneda?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceChargePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tip?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutPaymentDto)
  payments!: CheckoutPaymentDto[];
}
