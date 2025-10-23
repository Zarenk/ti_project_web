import { PartialType } from '@nestjs/mapped-types';
import { CreateProductSpecDto } from './create-productspec.dto';

export class UpdateProductSpecDto extends PartialType(CreateProductSpecDto) {}
