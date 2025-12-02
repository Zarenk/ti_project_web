import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CancelSubscriptionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organizationId!: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  cancelImmediately?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reasonCategory?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customReason?: string;
}
