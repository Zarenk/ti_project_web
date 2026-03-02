import { PartialType } from '@nestjs/mapped-types';
import { CreateGymClassDto } from './create-gym-class.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateGymClassDto extends PartialType(CreateGymClassDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
