import { IsNumber, IsString } from 'class-validator';

export class CreateJournalDto {
  @IsString()
  reference!: string;

  @IsNumber()
  amount!: number;
}