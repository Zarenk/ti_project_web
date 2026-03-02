import { Provider } from '@prisma/client';
import { AutoManagedBase } from '../../common/dto/auto-managed-fields';

export type CreateProviderDto = Omit<Provider, AutoManagedBase>;
