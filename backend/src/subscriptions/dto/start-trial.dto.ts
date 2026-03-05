import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class StartTrialDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organizationId!: number;

  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;

  @IsOptional()
  @IsBoolean()
  paymentEnforced?: boolean;
}
