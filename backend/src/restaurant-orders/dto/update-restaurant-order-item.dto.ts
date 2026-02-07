import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateRestaurantOrderItemDto {
  @IsOptional()
  @IsNumber()
  stationId?: number | null;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['PENDING', 'COOKING', 'READY', 'SERVED', 'CANCELLED'])
  status?: 'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';
}
