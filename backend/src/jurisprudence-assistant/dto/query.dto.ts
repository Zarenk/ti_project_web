import { IsString, IsOptional, IsInt, IsArray, Min, MaxLength } from 'class-validator';

export class QueryDto {
  @IsString()
  @MaxLength(1000)
  query!: string;

  @IsInt()
  @IsOptional()
  legalMatterId?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  courts?: string[];

  @IsInt()
  @Min(2000)
  @IsOptional()
  minYear?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  areas?: string[];
}

export class UpdateQueryFeedbackDto {
  @IsOptional()
  helpful?: boolean;

  @IsOptional()
  citationsCorrect?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
