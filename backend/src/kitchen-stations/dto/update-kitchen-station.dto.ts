import { PartialType } from '@nestjs/swagger';
import { CreateKitchenStationDto } from './create-kitchen-station.dto';

export class UpdateKitchenStationDto extends PartialType(
  CreateKitchenStationDto,
) {}
