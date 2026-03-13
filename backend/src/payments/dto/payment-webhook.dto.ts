import { IsString, IsOptional, IsObject } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  provider!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
