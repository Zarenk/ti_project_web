import { CreateClientDto } from './create-client.dto';

//export class UpdateProductDto extends PartialType(CreateProductDto) {}

export type UpdateClientDto = Partial<CreateClientDto> & {
  id: number;
  organizationId?: number | null;
};
