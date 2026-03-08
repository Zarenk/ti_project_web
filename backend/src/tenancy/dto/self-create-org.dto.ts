import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const BUSINESS_VERTICALS = [
  'GENERAL',
  'COMPUTERS',
  'RESTAURANTS',
  'RETAIL',
  'SERVICES',
  'MANUFACTURING',
  'LAW_FIRM',
] as const;

export class SelfCreateOrgDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la organización es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100)
  organizationName!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa es obligatorio' })
  @MinLength(2, { message: 'El nombre de la empresa debe tener al menos 2 caracteres' })
  @MaxLength(100)
  companyName!: string;

  @IsOptional()
  @IsIn(BUSINESS_VERTICALS, { message: 'Vertical de negocio no válida' })
  businessVertical?: (typeof BUSINESS_VERTICALS)[number];
}
