import { CreateStoreDto } from './create-store.dto';

//export class UpdateProductDto extends PartialType(CreateProductDto) {}

export type UpdateStoreDto = Partial<CreateStoreDto> & { id: number };
