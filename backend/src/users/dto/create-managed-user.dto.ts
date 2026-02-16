import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

const MANAGED_USER_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN_ORG,
  UserRole.EMPLOYEE,
  UserRole.CLIENT,
];

export class CreateManagedUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(MANAGED_USER_ROLES, { message: 'Rol invalido' })
  role!: UserRole;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  organizationId?: number;
}
