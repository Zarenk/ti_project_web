import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  Scope,
} from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextGuard implements CanActivate {
  private readonly logger = new Logger(TenantContextGuard.name);
  constructor(private readonly tenantContextService: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    try {
      request.tenantContext = this.tenantContextService.getContext();
    } catch (error) {
      const orgHeader = request.headers['x-org-id'];
      const companyHeader = request.headers['x-company-id'];
      this.logger.warn(
        `tenant context failed -> org=${orgHeader} company=${companyHeader} error=${
          error instanceof Error ? error.message : error
        }`,
      );
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
