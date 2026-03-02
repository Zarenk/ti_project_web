import { User } from '@prisma/client';
import { AutoManagedBase } from '../../common/dto/auto-managed-fields';

export type CreateUserDto = Omit<User, AutoManagedBase>;
