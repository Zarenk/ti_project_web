import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_PERMISSION_KEY } from '../decorators/module-permission.decorator';
import { SiteSettingsService } from 'src/site-settings/site-settings.service';

interface RequestWithUser {
  user?: {
    role?: string;
  };
}

@Injectable()
export class ModulePermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly siteSettingsService: SiteSettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionKey = this.reflector.getAllAndOverride<string>(
      MODULE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissionKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userRole = request.user?.role;

    const settings = await this.siteSettingsService.getSettings();
    const permissions = (settings.data as Record<string, any>)?.permissions as
      | Record<string, boolean>
      | undefined;

    if (permissions?.[permissionKey] === false && !this.isAdmin(userRole)) {
      throw new ForbiddenException('Module access is disabled.');
    }

    return true;
  }

  private isAdmin(role?: string): boolean {
    return role?.toUpperCase() === 'ADMIN';
  }
}