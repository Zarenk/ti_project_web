import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateSeriesDto {}

export class RegisterSeriesDto {
  @IsString()
  @IsNotEmpty({ message: 'El número de serie es obligatorio.' })
  serial!: string;

  @IsNumber({}, { message: 'El ID del producto es obligatorio.' })
  productId!: number;

  @IsNumber({}, { message: 'El ID de la tienda es obligatorio.' })
  storeId!: number;
}
