import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReviewCreativeDto {
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  organizationId?: number;
}