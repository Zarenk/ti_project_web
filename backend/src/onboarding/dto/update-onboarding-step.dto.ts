import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export enum OnboardingStepKey {
  COMPANY_PROFILE = 'companyProfile',
  STORE_SETUP = 'storeSetup',
  SUNAT_SETUP = 'sunatSetup',
  DATA_IMPORT = 'dataImport',
}

export class UpdateOnboardingStepDto {
  @IsEnum(OnboardingStepKey)
  step!: OnboardingStepKey;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsObject()
  payload?: Record<string, any> | null;
}
