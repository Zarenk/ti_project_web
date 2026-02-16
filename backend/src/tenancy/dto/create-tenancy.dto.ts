import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const COMPANY_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
const SUNAT_ENVIRONMENTS = ['BETA', 'PROD'] as const;

export class CompanyInputDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  legalName?: string | null;

  @IsOptional()
  @IsString()
  taxId?: string | null;

  @IsOptional()
  @IsIn(COMPANY_STATUSES)
  status?: (typeof COMPANY_STATUSES)[number];

  @IsOptional()
  @IsIn(SUNAT_ENVIRONMENTS)
  sunatEnvironment?: (typeof SUNAT_ENVIRONMENTS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  sunatRuc?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatBusinessName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  sunatPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryColor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  secondaryColor?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultQuoteMargin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatSolUserBeta?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatSolPasswordBeta?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatCertPathBeta?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatKeyPathBeta?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatSolUserProd?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatSolPasswordProd?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatCertPathProd?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sunatKeyPathProd?: string | null;
}

export class OrganizationUnitInputDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsOptional()
  @IsInt()
  parentUnitId?: number | null;

  @IsOptional()
  @IsString()
  parentCode?: string;

  @IsOptional()
  @IsInt()
  companyId?: number | null;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateTenancyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizationUnitInputDto)
  units?: OrganizationUnitInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyInputDto)
  companies?: CompanyInputDto[];
}
