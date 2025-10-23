import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsInt()
  productId!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  comment?: string;
}
