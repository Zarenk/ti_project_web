import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCalendarNoteDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdateCalendarNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @IsOptional()
  @IsDateString()
  reminderAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
