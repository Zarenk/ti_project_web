import { IsNumber, IsString } from 'class-validator';

export class DebitNotePostedDto {
  @IsNumber()
  debitNoteId!: number;

  @IsString()
  timestamp!: string;
}