import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class AdminPlanMigrationDto {
  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}
