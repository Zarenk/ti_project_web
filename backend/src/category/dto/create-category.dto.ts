import { Category } from '@prisma/client';
import { AutoManagedBase } from '../../common/dto/auto-managed-fields';

export type CreateCategoryDto = Omit<Category, AutoManagedBase>;
