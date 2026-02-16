import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { TenantContext } from 'src/tenancy/tenant-context.interface';

@Injectable()
export class TenantRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { tenantContext?: TenantContext }>();
    const tenant = request.tenantContext;
    const orgId = tenant?.organizationId ?? null;
    const companyId = tenant?.companyId ?? null;
    if (!orgId && !companyId) {
      throw new BadRequestException('Contexto de tenant no disponible.');
    }
    return true;
  }
}
