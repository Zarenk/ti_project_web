import { Client } from '@prisma/client';
import { AutoManagedTenant } from '../../common/dto/auto-managed-fields';

export type CreateClientDto = Omit<Client, AutoManagedTenant> & {
  organizationId?: number | null;
};
