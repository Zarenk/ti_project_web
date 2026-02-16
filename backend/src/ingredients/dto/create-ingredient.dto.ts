import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateIngredientDto {
  @IsString()
  name!: string;

  @IsString()
  unit!: string;

  @IsOptional()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  organizationId?: number;

  @IsOptional()
  @IsInt()
  companyId?: number;
}
