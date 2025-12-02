import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ChangePlanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  organizationId!: number;

  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  effectiveImmediately?: boolean;
}
