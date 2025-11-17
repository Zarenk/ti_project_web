import { PartialType } from '@nestjs/swagger';
import { CreateOrdertrackingDto } from './create-ordertracking.dto';

export class UpdateOrdertrackingDto extends PartialType(
  CreateOrdertrackingDto,
) {}
