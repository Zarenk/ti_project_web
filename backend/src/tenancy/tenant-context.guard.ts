import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Scope,
} from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextGuard implements CanActivate {
  constructor(private readonly tenantContextService: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    try {
      request.tenantContext = this.tenantContextService.getContext();
    } catch (error) {
      if (error instanceof BadRequestException) {
        request.tenantContext =
          this.tenantContextService.getContextWithFallback();
      } else {
        throw error;
      }
    }
    return true;
  }
}
