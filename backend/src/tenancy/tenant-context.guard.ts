import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  Scope,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_TENANT_CONTEXT_KEY } from './skip-tenant-context.decorator';
import { TenantContextService } from './tenant-context.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextGuard implements CanActivate {
  private readonly logger = new Logger(TenantContextGuard.name);
  private readonly reflector = new Reflector();

  constructor(private readonly tenantContextService: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_CONTEXT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) {
      return true;
    }
    try {
      request.tenantContext = this.tenantContextService.getContext();
    } catch (error) {
      this.logger.warn(
        `Unable to resolve tenant context. Falling back when possible: ${
          error instanceof Error ? error.message : String(error)
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
