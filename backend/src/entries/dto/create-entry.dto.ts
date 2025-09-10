import { ApiPropertyOptional } from '@nestjs/swagger';
import { EntryPaymentMethod } from '@prisma/client';

export class CreateEntryDto {
  @ApiPropertyOptional({ enum: EntryPaymentMethod, default: EntryPaymentMethod.CASH })
  paymentMethod?: EntryPaymentMethod;
}
