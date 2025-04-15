//export class CreateProductDto {}

import {Provider} from '@prisma/client'

export type CreateProviderDto = Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>
