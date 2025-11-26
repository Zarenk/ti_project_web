import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_CONTEXT_KEY = 'skipTenantContextGuard';

export function SkipTenantContextGuard(): MethodDecorator & ClassDecorator {
  return SetMetadata(SKIP_TENANT_CONTEXT_KEY, true);
}
