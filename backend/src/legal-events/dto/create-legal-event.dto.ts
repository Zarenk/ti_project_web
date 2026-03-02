import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLegalEventDto {
  @IsNumber()
  matterId!: number;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  @IsOptional()
  @IsNumber()
  assignedToId?: number;
}

export class UpdateLegalEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;

  @IsOptional()
  @IsNumber()
  assignedToId?: number | null;
}

export class CreateLegalNoteDto {
  @IsNumber()
  matterId!: number;

  @IsString()
  content!: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdateLegalNoteDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class CreateLegalTimeEntryDto {
  @IsNumber()
  matterId!: number;

  @IsString()
  description!: string;

  @IsNumber()
  hours!: number;

  @IsOptional()
  @IsNumber()
  rate?: number;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class UpdateLegalTimeEntryDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  hours?: number;

  @IsOptional()
  @IsNumber()
  rate?: number | null;

  @IsOptional()
  @IsBoolean()
  billable?: boolean;

  @IsOptional()
  @IsDateString()
  date?: string;
}
