//export class CreateProductDto {}

import {Store} from '@prisma/client'

export type CreateStoreDto = Omit<Store, 'id' | 'createdAt' | 'updatedAt'>
