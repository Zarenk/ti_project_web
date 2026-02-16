import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateRestaurantOrderDto {
  @IsOptional()
  @IsNumber()
  tableId?: number | null;

  @IsOptional()
  @IsNumber()
  storeId?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'READY', 'SERVED', 'CANCELLED', 'CLOSED'])
  status?: 'OPEN' | 'IN_PROGRESS' | 'READY' | 'SERVED' | 'CANCELLED' | 'CLOSED';
}
