import { IsDateString, IsNotEmptyObject, IsObject, IsOptional } from 'class-validator';

type SettingsPayload = Record<string, unknown>;

export class UpdateSiteSettingsDto {
  @IsObject()
  @IsNotEmptyObject()
  data!: SettingsPayload;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}