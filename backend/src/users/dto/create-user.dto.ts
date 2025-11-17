//export class CreateUserDto {}

import { User } from '@prisma/client';

export type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
