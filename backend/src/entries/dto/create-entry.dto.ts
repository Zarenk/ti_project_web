import { ApiPropertyOptional } from '@nestjs/swagger';
import { EntryPaymentMethod, PaymentTerm } from '@prisma/client';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class EntryDetailDto {
  @IsInt()
  @IsPositive()
  productId!: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  price!: number;

  @IsNumber()
  priceInSoles!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  series?: string[];
}

class EntryInvoiceDto {
  @IsString()
  serie!: string;

  @IsString()
  nroCorrelativo!: string;

  @IsString()
  tipoComprobante!: string;

  @IsString()
  tipoMoneda!: string;

  @IsNumber()
  total!: number;

  @IsNotEmpty()
  @Type(() => Date)
  fechaEmision!: Date;
}

class EntryGuideDto {
  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @IsString()
  correlativo?: string;

  @IsOptional()
  @IsString()
  fechaEmision?: string;

  @IsOptional()
  @IsString()
  fechaEntregaTransportista?: string;

  @IsOptional()
  @IsString()
  motivoTraslado?: string;

  @IsOptional()
  @IsString()
  puntoPartida?: string;

  @IsOptional()
  @IsString()
  puntoLlegada?: string;

  @IsOptional()
  @IsString()
  destinatario?: string;

  @IsOptional()
  @IsString()
  pesoBrutoUnidad?: string;

  @IsOptional()
  @IsString()
  pesoBrutoTotal?: string;

  @IsOptional()
  @IsString()
  transportista?: string;
}

export class CreateEntryDto {
  @IsInt()
  @IsPositive()
  storeId!: number;

  @IsInt()
  @IsPositive()
  userId!: number;

  @IsInt()
  @IsPositive()
  providerId!: number;

  @IsNotEmpty()
  @Type(() => Date)
  date!: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  tipoMoneda?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  tipoCambioId?: number;

  @IsOptional()
  @ApiPropertyOptional({
    enum: EntryPaymentMethod,
    default: EntryPaymentMethod.CASH,
  })
  @IsEnum(EntryPaymentMethod)
  paymentMethod?: EntryPaymentMethod;

  @IsOptional()
  @ApiPropertyOptional({ enum: PaymentTerm, default: PaymentTerm.CASH })
  @IsEnum(PaymentTerm)
  paymentTerm?: PaymentTerm;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @IsString()
  correlativo?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsNumber()
  totalGross?: number;

  @IsOptional()
  @IsNumber()
  igvRate?: number;

  @IsOptional()
  @ApiPropertyOptional({ nullable: true })
  @IsInt()
  organizationId?: number | null;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntryDetailDto)
  details!: EntryDetailDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => EntryInvoiceDto)
  invoice?: EntryInvoiceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EntryGuideDto)
  guide?: EntryGuideDto;
}
