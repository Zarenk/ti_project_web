import { PartialType } from '@nestjs/mapped-types';
import { CreateGymTrainerDto } from './create-gym-trainer.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateGymTrainerDto extends PartialType(CreateGymTrainerDto) {
  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'INACTIVE';
}
