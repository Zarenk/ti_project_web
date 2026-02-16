import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BillingPaymentProvider } from '@prisma/client';

export class UpsertPaymentMethodDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organizationId!: number;

  @IsEnum(BillingPaymentProvider)
  provider!: BillingPaymentProvider;

  @IsString()
  @IsNotEmpty()
  externalId!: string;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @IsOptional()
  @IsString()
  last4?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expMonth?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  expYear?: number | null;

  @IsOptional()
  @IsString()
  country?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  billingCustomerId?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  tokenized?: boolean;

  @IsOptional()
  @IsString()
  cardholderName?: string | null;

  @IsOptional()
  @IsString()
  cardholderEmail?: string | null;

  @IsOptional()
  @IsString()
  identificationType?: string | null;

  @IsOptional()
  @IsString()
  identificationNumber?: string | null;
}
