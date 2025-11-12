import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const SUNAT_ENVIRONMENTS = ['BETA', 'PROD'] as const;

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

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
