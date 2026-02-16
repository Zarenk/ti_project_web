import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class ValidateContextDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  orgId!: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(parsed) ? Number(parsed) : null;
  })
  @IsInt()
  @Min(1)
  companyId?: number | null;
}
