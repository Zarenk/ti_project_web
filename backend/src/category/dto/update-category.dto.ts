import { CreateCategoryDto } from './create-category.dto';

//export class UpdateProductDto extends PartialType(CreateProductDto) {}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;
