import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateChatDto {
  @IsInt()
  clientId!: number;

  @IsInt()
  senderId!: number;

  @IsString()
  @IsOptional()
  text?: string;

  @IsOptional()
  @IsString()
  file?: string;
}
