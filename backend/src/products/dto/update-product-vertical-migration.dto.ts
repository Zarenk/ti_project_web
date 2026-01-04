import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class UpdateProductVerticalMigrationDto {
  @IsObject()
  extraAttributes!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  markMigrated?: boolean;
}
