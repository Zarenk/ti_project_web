import { IsOptional, IsString } from 'class-validator';

export class ClearDemoDataDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
