import { CreateProviderDto } from './create-provider.dto';

//export class UpdateProductDto extends PartialType(CreateProductDto) {}

export type UpdateProviderDto = Partial<CreateProviderDto> & { id: number };
