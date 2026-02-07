import { IsInt, IsOptional, IsString, Min, IsEnum } from 'class-validator';
import { RestaurantTableStatus } from '@prisma/client';

export class CreateRestaurantTableDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsEnum(RestaurantTableStatus)
  status?: RestaurantTableStatus;

  @IsOptional()
  @IsInt()
  organizationId?: number;

  @IsOptional()
  @IsInt()
  companyId?: number;
}
