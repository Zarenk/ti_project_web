import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const ALLOWED_DURATIONS = [1, 3, 6, 12] as const;

export class AdminComplimentaryDto {
  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsIn(ALLOWED_DURATIONS)
  durationMonths!: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}
