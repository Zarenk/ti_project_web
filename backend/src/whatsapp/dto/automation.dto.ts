import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateAutomationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  triggerEvent!: string; // e.g., "sale.created", "payment.overdue"

  @IsOptional()
  triggerFilters?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  recipients!: string[]; // Phone numbers or ["client", "admin"]

  @IsNumber()
  @IsOptional()
  templateId?: number;

  @IsNumber()
  @IsOptional()
  delayMinutes?: number = 0;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateAutomationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  triggerFilters?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recipients?: string[];

  @IsNumber()
  @IsOptional()
  templateId?: number;

  @IsNumber()
  @IsOptional()
  delayMinutes?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  variables!: string[];
}
