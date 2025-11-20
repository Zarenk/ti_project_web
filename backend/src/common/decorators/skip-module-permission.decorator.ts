import { SetMetadata } from '@nestjs/common';

export const SKIP_MODULE_PERMISSION_KEY = 'skipModulePermissionsGuard';

export function SkipModulePermissionsGuard(): MethodDecorator & ClassDecorator {
  return SetMetadata(SKIP_MODULE_PERMISSION_KEY, true);
}
