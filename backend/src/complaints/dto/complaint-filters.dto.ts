import { IsOptional, IsString, IsIn, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ComplaintFiltersDto {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'RESPONDED', 'OVERDUE'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['RECLAMO', 'QUEJA'])
  complaintType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
