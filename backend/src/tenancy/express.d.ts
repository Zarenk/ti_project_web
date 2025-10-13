import 'express-serve-static-core';

import { TenantContext } from './tenant-context.interface';

declare module 'express-serve-static-core' {
  interface Request {
    tenantContext?: TenantContext;
  }
}