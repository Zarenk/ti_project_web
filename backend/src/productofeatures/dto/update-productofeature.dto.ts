import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoFeatureDto } from './create-productofeature.dto';

export class UpdateProductFeatureDto extends PartialType(
  CreateProductoFeatureDto,
) {}
