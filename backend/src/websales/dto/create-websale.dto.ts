import { IsArray, IsIn, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WebSaleDetailDto {
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
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  series?: string[];
}

class WebPaymentDto {
  @IsNumber()
  paymentMethodId!: number;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  currency!: string;
}

export class CreateWebSaleDto {
  @IsNumber()
  @IsPositive()
  userId!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  storeId?: number;

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
  @Type(() => WebSaleDetailDto)
  details!: WebSaleDetailDto[];

  @IsOptional()
  @IsString()
  tipoComprobante?: string;

  @IsString()
  tipoMoneda!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebPaymentDto)
  payments!: WebPaymentDto[];

  @IsOptional()
  @IsIn(['WEB'])
  source?: 'WEB';

  @IsOptional()
  @IsString()
  shippingName?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsString()
  estimatedDelivery?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  code?: string;

  // Datos para emisión del comprobante
  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  invoiceName?: string;

  @IsOptional()
  @IsString()
  ruc?: string;

  @IsOptional()
  @IsString()
  razonSocial?: string;

  @IsOptional()
  @IsString()
  invoiceAddress?: string;
}