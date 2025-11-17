import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CompanyDocumentSequenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  documentType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  serie!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  @Matches(/^\d+$/, {
    message: 'El numero correlativo debe contener solo digitos.',
  })
  nextCorrelative!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  correlativeLength?: number | null;
}
