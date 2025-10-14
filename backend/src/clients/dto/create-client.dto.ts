//export class CreateProductDto {}

import { Client } from '@prisma/client';

export type CreateClientDto = Omit<
  Client,
  'id' | 'createdAt' | 'updatedAt' | 'organizationId'
> & {
  organizationId?: number | null;
};