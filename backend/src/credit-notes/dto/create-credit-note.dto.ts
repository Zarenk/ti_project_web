import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCreditNoteDto {
  @IsNumber()
  saleId!: number;

  @IsString()
  @IsNotEmpty()
  motivo!: string;

  @IsString()
  @IsOptional()
  codigoMotivo?: string;

  @IsDateString()
  @IsOptional()
  fechaEmision?: string;
}
