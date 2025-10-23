import { SetMetadata } from '@nestjs/common';

export const MODULE_PERMISSION_KEY = 'module_permission';

export const ModulePermission = (permission: string | string[]) =>
  SetMetadata(MODULE_PERMISSION_KEY, permission);
