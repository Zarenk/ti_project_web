import { PartialType } from '@nestjs/swagger';
import { CreateSystemMaintenanceDto } from './create-system-maintenance.dto';

export class UpdateSystemMaintenanceDto extends PartialType(
  CreateSystemMaintenanceDto,
) {}
