import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
