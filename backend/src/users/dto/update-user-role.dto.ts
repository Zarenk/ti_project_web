import { UserRole } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';

export class UpdateUserRoleDto {
  @IsOptional()
  @IsEnum(UserRole, { message: 'Rol invalido' })
  role?: UserRole;

  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO'], {
    message: 'El estado debe ser ACTIVO o INACTIVO',
  })
  status?: 'ACTIVO' | 'INACTIVO';
}
