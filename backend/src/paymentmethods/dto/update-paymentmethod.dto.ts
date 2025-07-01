import { PartialType } from '@nestjs/swagger';
import { CreatePaymentmethodDto } from './create-paymentmethod.dto';

export class UpdatePaymentmethodDto extends PartialType(CreatePaymentmethodDto) {}
