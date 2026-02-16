import { IsOptional, IsString } from 'class-validator';

export class SeedDemoDataDto {
  @IsOptional()
  @IsString()
  industry?: string;
}
