import { IsInt, IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateGymMembershipDto {
  @IsInt()
  memberId!: number;

  @IsString()
  planName!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxFreezes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;
}
