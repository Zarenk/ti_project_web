import { PartialType } from '@nestjs/mapped-types';
import { CreateCashClosureDto } from './create-cashclosure.dto';

export class UpdateCashClosureDto extends PartialType(CreateCashClosureDto) {}