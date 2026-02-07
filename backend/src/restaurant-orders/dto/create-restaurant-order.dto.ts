import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRestaurantOrderItemDto {
  @IsNumber()
  productId!: number;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  stationId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRestaurantOrderDto {
  @IsOptional()
  @IsNumber()
  organizationId?: number | null;

  @IsOptional()
  @IsNumber()
  companyId?: number | null;

  @IsOptional()
  @IsNumber()
  storeId?: number | null;

  @IsOptional()
  @IsNumber()
  tableId?: number | null;

  @IsOptional()
  @IsNumber()
  clientId?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['DINE_IN', 'TAKEAWAY', 'TAKEOUT', 'DELIVERY'])
  orderType?: 'DINE_IN' | 'TAKEAWAY' | 'TAKEOUT' | 'DELIVERY';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRestaurantOrderItemDto)
  items!: CreateRestaurantOrderItemDto[];
}
