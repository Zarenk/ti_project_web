import { PartialType } from '@nestjs/swagger';
import { CreateRestaurantTableDto } from './create-restaurant-table.dto';

export class UpdateRestaurantTableDto extends PartialType(
  CreateRestaurantTableDto,
) {}
