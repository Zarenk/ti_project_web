import { IsNumber, IsString } from 'class-validator';

export class CreateJournalDto {
  @IsString()
  date!: string;

  @IsString()
  description!: string;

  @IsNumber()
  amount!: number;
}
