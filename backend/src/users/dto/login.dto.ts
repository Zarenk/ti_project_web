import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'La contraseña es obligatoria.' })
  @MaxLength(128, { message: 'La contraseña excede el largo máximo permitido.' })
  password!: string;
}
