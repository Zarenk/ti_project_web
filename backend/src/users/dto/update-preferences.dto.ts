import { IsOptional, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['simple', 'contador'])
  accountingMode?: string;
}
