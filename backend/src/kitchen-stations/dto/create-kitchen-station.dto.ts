import { IsInt, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateKitchenStationDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  organizationId?: number;

  @IsOptional()
  @IsInt()
  companyId?: number;
}
