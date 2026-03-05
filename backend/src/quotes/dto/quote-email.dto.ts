import { IsOptional, IsString, IsEmail } from 'class-validator';

export class QuoteEmailDto {
  @IsEmail({}, { message: 'El email del destinatario no es válido.' })
  to!: string;

  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  message?: string;
}
