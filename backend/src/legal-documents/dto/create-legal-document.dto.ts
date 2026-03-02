import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLegalDocumentDto {
  @IsNumber()
  matterId!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
