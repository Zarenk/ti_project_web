import { IsInt, IsOptional, IsString, Min, Max, Matches } from 'class-validator';

export class CreateGymScheduleDto {
  @IsInt()
  classId!: number;

  @IsOptional()
  @IsInt()
  trainerId?: number;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime!: string;
}
