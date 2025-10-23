import { CanActivate, ExecutionContext, Injectable, Scope } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextGuard implements CanActivate {
  constructor(private readonly tenantContextService: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.tenantContext = this.tenantContextService.getContext();
    return true;
  }
}
