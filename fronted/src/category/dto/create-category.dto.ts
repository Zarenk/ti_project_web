//export class CreateCategoryDto {}

import{Category} from '@prisma/client'

export type CreateCategoryDto = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>