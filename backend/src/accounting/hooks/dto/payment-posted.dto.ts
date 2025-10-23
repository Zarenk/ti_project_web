import { IsNumber, IsString } from 'class-validator';

export class PaymentPostedDto {
  @IsNumber()
  paymentId!: number;

  @IsString()
  timestamp!: string;
}
