export class CreateExchangeDto {}
// src/tipo-cambio/dto/create-tipo-cambio.dto.ts
import {
    IsDateString,
    IsNumber,
    IsString,
    Min,
    MaxLength,
    Matches,
  } from 'class-validator';

export class CreateTipoCambioDto {
    @IsDateString({}, { message: 'La fecha debe tener formato YYYY-MM-DD' })
    fecha!: string;
  
    @IsString({ message: 'La moneda es requerida' })
    @MaxLength(3, { message: 'La moneda debe tener máximo 3 caracteres (ej. USD)' })
    @Matches(/^[A-Z]{3}$/, { message: 'La moneda debe tener 3 letras en mayúscula (ej. USD)' })
    moneda!: string;
  
    @IsNumber({}, { message: 'El valor del tipo de cambio debe ser un número' })
    @Min(0.0001, { message: 'El valor del tipo de cambio debe ser mayor que 0' })
    valor!: number;
}