import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class AssignTemplateDto {
  @IsInt()
  templateId!: number;

  @IsOptional()
  @IsBoolean()
  reprocess?: boolean;
}
