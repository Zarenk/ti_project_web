import { CreateProductDto } from "./create-product.dto";

//export class UpdateProductDto extends PartialType(CreateProductDto) {}

export type UpdateProductDto = Partial<CreateProductDto> & { id: number };
