import { IsString } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;
}
