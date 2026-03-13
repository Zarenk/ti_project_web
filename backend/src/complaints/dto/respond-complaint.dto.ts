import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RespondComplaintDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  responseText!: string;
}
