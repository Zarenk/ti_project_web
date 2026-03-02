import { PartialType } from '@nestjs/mapped-types';
import { CreateGymMemberDto } from './create-gym-member.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateGymMemberDto extends PartialType(CreateGymMemberDto) {
  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'INACTIVE';
}
