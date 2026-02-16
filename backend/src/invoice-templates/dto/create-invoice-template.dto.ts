import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceTemplateDto {
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  providerId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsObject()
  regexRules?: Record<string, any>;

  @IsOptional()
  @IsObject()
  fieldMappings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  extractionHints?: Record<string, any>;

  @IsOptional()
  @IsString()
  sampleFilename?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
