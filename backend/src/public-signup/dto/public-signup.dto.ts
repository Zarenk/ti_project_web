import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PublicSignupDto {
  @IsString()
  @MaxLength(80)
  @MinLength(3)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]{8,}$/,
    {
      message:
        'La contraseña debe incluir al menos una letra y un número (8 caracteres).',
    },
  )
  password!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(60)
  organizationName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(60)
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  industry?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  planCode?: string;

  @IsString()
  @IsNotEmpty()
  recaptchaToken!: string;
}
