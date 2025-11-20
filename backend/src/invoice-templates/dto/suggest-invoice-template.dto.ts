import { IsString, IsNotEmpty } from 'class-validator';

export class SuggestInvoiceTemplateDto {
  @IsString()
  @IsNotEmpty()
  sampleText!: string;
}
