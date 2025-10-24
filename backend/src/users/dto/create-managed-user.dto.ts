import { IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from "class-validator";

export class CreateManagedUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(['ADMIN', 'SUPER_ADMIN_ORG'])
  role!: 'ADMIN' | 'SUPER_ADMIN_ORG';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  organizationId?: number;
}