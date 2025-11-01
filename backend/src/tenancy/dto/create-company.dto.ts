import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
} from 'class-validator';

export class CreateCompanyDto {
  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  taxId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}
