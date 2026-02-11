import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CompanyDocumentSequenceDto } from './company-document-sequence.dto';

const SUNAT_ENVIRONMENTS = ['BETA', 'PROD'] as const;

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
  @MaxLength(255)
  logoUrl?: string | null;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompanyDocumentSequenceDto)
  documentSequences?: CompanyDocumentSequenceDto[];
}
