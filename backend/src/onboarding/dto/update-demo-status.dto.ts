import { DemoDataStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateDemoStatusDto {
  @IsEnum(DemoDataStatus)
  status!: DemoDataStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
