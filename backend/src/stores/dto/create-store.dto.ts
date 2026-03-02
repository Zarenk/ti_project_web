import { Store } from '@prisma/client';
import { AutoManagedMultiTenant } from '../../common/dto/auto-managed-fields';

export type CreateStoreDto = Omit<Store, AutoManagedMultiTenant> & {
  organizationId?: number | null;
  companyId?: number | null;
};
