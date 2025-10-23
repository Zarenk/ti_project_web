import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { TenantContext } from './tenant-context.interface';

interface RequestWithTenantContext extends Request {
  user?: { role?: string };
  tenantContext?: TenantContext;
}

@Injectable()
export class GlobalSuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithTenantContext>();

    if (!request) {
      throw new ForbiddenException('Global super admin privileges required.');
    }

    const tenantContext = request.tenantContext;
    const role = request.user?.role?.toUpperCase();

    const hasGlobalPrivileges =
      tenantContext?.isGlobalSuperAdmin ||
      role === 'SUPER_ADMIN_GLOBAL' ||
      role === 'SUPER_ADMIN';

    if (!hasGlobalPrivileges) {
      throw new ForbiddenException('Global super admin privileges required.');
    }

    return true;
  }
}
