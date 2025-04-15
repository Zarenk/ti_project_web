import { CreateUserDto } from "./create-user.dto";

//export class UpdateProductDto extends PartialType(CreateProductDto) {}

export type UpdateUserDto = Partial<CreateUserDto>;
