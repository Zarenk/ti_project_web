import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateGymClassDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;
}
