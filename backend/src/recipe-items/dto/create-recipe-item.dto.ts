import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRecipeItemDto {
  @IsInt()
  productId!: number;

  @IsInt()
  ingredientId!: number;

  @Min(0)
  quantity!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsInt()
  organizationId?: number;

  @IsOptional()
  @IsInt()
  companyId?: number;
}
