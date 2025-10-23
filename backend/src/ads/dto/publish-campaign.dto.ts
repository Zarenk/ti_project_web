import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class PublishCampaignDto {
  @IsBoolean()
  publish!: boolean;

  @IsOptional()
  @IsNumber()
  organizationId?: number;
}
