import { IsInt, IsDateString } from 'class-validator';

export class CreateGymBookingDto {
  @IsInt()
  scheduleId!: number;

  @IsInt()
  memberId!: number;

  @IsDateString()
  bookingDate!: string;
}
