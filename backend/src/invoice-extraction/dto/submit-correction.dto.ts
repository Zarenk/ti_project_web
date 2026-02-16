import { IsOptional, IsObject, IsString, IsInt } from 'class-validator';

export class SubmitCorrectionDto {
  @IsOptional()
  @IsInt()
  templateId?: number;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsObject()
  fields?: Record<string, string | number | boolean>;
}
