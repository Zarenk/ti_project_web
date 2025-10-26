import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class WebSaleDetailDto {
  @IsInt()
  @Min(1)
  productId!: number;

  @IsInt()
  @Min(1)
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
  @IsInt()
  @Min(1)
  paymentMethodId!: number;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class CreateWebSaleDto {
  @IsInt()
  @Min(1)
  userId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  storeId?: number;

  // ✅ tenant: permitir recibir null y convertirlo a undefined para que IsOptional lo ignore
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === null ? undefined : value))
  organizationId?: number;

  // ✅ NUEVO: companyId opcional, mismo tratamiento que organizationId
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value === null ? undefined : value))
  companyId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
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
  personalDni?: string;

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
