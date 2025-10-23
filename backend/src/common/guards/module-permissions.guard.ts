import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { MODULE_PERMISSION_KEY } from '../decorators/module-permission.decorator';
import { SiteSettingsService } from 'src/site-settings/site-settings.service';

interface RequestWithUser extends Request {
  user?: {
    role?: string;
  };
}

@Injectable()
export class ModulePermissionsGuard implements CanActivate {
  private readonly jwtService: JwtService;

  constructor(
    private readonly reflector: Reflector,
    private readonly siteSettingsService: SiteSettingsService,
    configService: ConfigService,
  ) {
    this.jwtService = new JwtService({
      secret: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionKey = this.reflector.getAllAndOverride<string | string[]>(
      MODULE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissionKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const requiredKeys = Array.isArray(permissionKey)
      ? permissionKey
      : [permissionKey];

    if (
      requiredKeys.includes('settings') &&
      request.method?.toUpperCase() === 'GET'
    ) {
      return true;
    }

    const userRole = this.resolveUserRole(request);
    if (this.isAdmin(userRole)) {
      return true;
    }

    const settings = await this.siteSettingsService.getSettings();
    const permissions = (settings.data as Record<string, any>)?.permissions as
      | Record<string, boolean>
      | undefined;

    const hasAccess = requiredKeys.some((key) => permissions?.[key] !== false);

    if (!hasAccess) {
      throw new ForbiddenException('Module access is disabled.');
    }

    return true;
  }

  private resolveUserRole(request: RequestWithUser): string | undefined {
    if (request.user?.role) {
      return request.user.role;
    }

    const token = this.extractToken(request);
    if (!token) {
      return undefined;
    }

    try {
      const payload = this.jwtService.verify(token);
      const role = (payload as Record<string, unknown>)?.['role'];
      return typeof role === 'string' ? role : undefined;
    } catch {
      return undefined;
    }
  }

  private extractToken(request: RequestWithUser): string | undefined {
    const headers = request.headers as Record<string, unknown> | undefined;
    const authHeader =
      (headers?.['authorization'] as string | undefined) ??
      (headers?.['Authorization'] as string | undefined);

    if (typeof authHeader === 'string') {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        return match[1].trim();
      }
    }

    const cookieToken = (request as any)?.cookies?.token;
    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      return cookieToken;
    }

    const cookieHeader = request.headers?.cookie;
    if (typeof cookieHeader === 'string') {
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }

    return undefined;
  }

  private isAdmin(role?: string): boolean {
    if (!role) {
      return false;
    }

    const normalized = role.toUpperCase();
    return (
      normalized === 'ADMIN' ||
      normalized === 'SUPER_ADMIN_GLOBAL' ||
      normalized === 'SUPER_ADMIN_ORG' ||
      normalized === 'SUPER_ADMIN'
    );
  }
}
