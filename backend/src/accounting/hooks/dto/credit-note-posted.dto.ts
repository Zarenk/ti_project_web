import { IsNumber, IsString } from 'class-validator';

export class CreditNotePostedDto {
  @IsNumber()
  creditNoteId!: number;

  @IsString()
  timestamp!: string;
}
