import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCreativeDto {
  @IsNumber()
  campaignId!: number;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsNumber()
  organizationId?: number;
}