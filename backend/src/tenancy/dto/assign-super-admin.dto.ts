import { IsInt } from 'class-validator';

export class AssignSuperAdminDto {
  @IsInt()
  userId!: number;
}
