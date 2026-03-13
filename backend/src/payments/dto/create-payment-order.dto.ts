import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  IsEmail,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentOrderDto {
  @Type(() => Number)
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount!: number;

  @IsOptional()
  @IsString()
  @IsEnum(['PEN', 'USD'], { message: 'Moneda debe ser PEN o USD' })
  currency?: string;

  @IsString()
  @IsEnum(['culqi', 'mercadopago', 'manual'], {
    message: 'Proveedor debe ser culqi, mercadopago o manual',
  })
  provider!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  clientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  clientPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;

  // Injected by controller from tenant context — decorated to pass whitelist
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organizationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  createdBy?: number;
}
