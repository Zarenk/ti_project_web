import { PartialType } from '@nestjs/mapped-types';
import { CreateCashTransactionDto } from './create-cashtransactions.dto';

export class UpdateCashTransactionDto extends PartialType(CreateCashTransactionDto) {}