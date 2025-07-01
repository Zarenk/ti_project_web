import { PartialType } from '@nestjs/mapped-types';
import { CreateCashRegisterDto } from './create-cashregister.dto';

export class UpdateCashRegisterDto extends PartialType(CreateCashRegisterDto) {}
