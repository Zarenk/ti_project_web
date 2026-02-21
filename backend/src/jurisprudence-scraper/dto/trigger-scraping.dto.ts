import { IsString, IsInt, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { JurisprudenceScrapeType } from '@prisma/client';

export class TriggerScrapingDto {
  @IsString()
  court!: string; // "Corte Suprema", "Corte Superior de Lima", etc.

  @IsInt()
  @Min(2000)
  @Max(new Date().getFullYear())
  @IsOptional()
  startYear?: number;

  @IsInt()
  @Min(2000)
  @Max(new Date().getFullYear())
  @IsOptional()
  endYear?: number;

  @IsEnum(JurisprudenceScrapeType)
  @IsOptional()
  scrapeType?: JurisprudenceScrapeType = JurisprudenceScrapeType.MANUAL;
}
