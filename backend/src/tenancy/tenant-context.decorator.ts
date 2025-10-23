import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from './tenant-context.interface';

export const CurrentTenant = createParamDecorator(
  (
    data: keyof TenantContext | undefined,
    ctx: ExecutionContext,
  ): TenantContext | TenantContext[keyof TenantContext] | null => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext: TenantContext | undefined = request?.tenantContext;

    if (!tenantContext) {
      return null;
    }

    if (!data) {
      return tenantContext;
    }

    return tenantContext[data];
  },
);
