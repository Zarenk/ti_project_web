import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ValidateProviderFieldsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  documentNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  providerId?: number;
}
