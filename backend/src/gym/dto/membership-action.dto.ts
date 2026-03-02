import { IsString, IsOptional } from 'class-validator';

export class MembershipActionDto {
  @IsString()
  event!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
