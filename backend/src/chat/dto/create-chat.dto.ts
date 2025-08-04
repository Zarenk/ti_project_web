import { IsInt, IsString, MinLength } from 'class-validator';

export class CreateChatDto {
  @IsInt()
  clientId!: number;

  @IsInt()
  senderId!: number;

  @IsString()
  @MinLength(1)
  text!: string;
}
