import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateCashRegisterDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  storeId!: number;

  @IsNotEmpty()
  @IsNumber()
  initialBalance!: number;

  @IsOptional()
  @IsNumber()
  organizationId?: number | null;

  @IsOptional() @IsNumber()
  companyId?: number | null;  
}
