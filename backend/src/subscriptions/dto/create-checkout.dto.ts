import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateCheckoutDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organizationId!: number;

  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @IsUrl()
  successUrl!: string;

  @IsUrl()
  cancelUrl!: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
