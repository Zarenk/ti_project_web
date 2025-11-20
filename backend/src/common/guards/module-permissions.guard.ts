import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { MODULE_PERMISSION_KEY } from '../decorators/module-permission.decorator';
import { SiteSettingsService } from 'src/site-settings/site-settings.service';
import type { TenantContext } from 'src/tenancy/tenant-context.interface';
import { SKIP_MODULE_PERMISSION_KEY } from '../decorators/skip-module-permission.decorator';

interface RequestWithUser extends Request {
  user?: {
    role?: string;
  };
  tenantContext?: TenantContext;
}

@Injectable()
export class ModulePermissionsGuard implements CanActivate {
  private readonly jwtService: JwtService;
  private readonly logger = new Logger(ModulePermissionsGuard.name);

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
    const skipGuard = this.reflector.getAllAndOverride<boolean>(
      SKIP_MODULE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipGuard) {
      return true;
    }

    const permissionKey = this.reflector.getAllAndOverride<string | string[]>(
      MODULE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissionKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    this.logger.debug(
      `module permissions check for handler=${context.getHandler()?.name} url=${request.url}`,
    );

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

    const { organizationId, companyId } = this.resolveTenantIds(request);
    let permissions: Record<string, boolean> | undefined;
    try {
      const settings = await this.siteSettingsService.getSettings(
        organizationId,
        companyId,
      );
      permissions = (settings.data as Record<string, any>)?.permissions as
        | Record<string, boolean>
        | undefined;
    } catch (error) {
      this.logger.warn(
        `metrics guard failed to load settings for org=${organizationId} company=${companyId}: ${error}`,
      );
      throw error;
    }

    const hasAccess = requiredKeys.some((key) => permissions?.[key] !== false);

    if (!hasAccess) {
      this.logger.warn(
        `Access denied for keys=${requiredKeys} / org=${organizationId} company=${companyId}`,
      );
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

  private resolveTenantIds(request: RequestWithUser): {
    organizationId: number | null;
    companyId: number | null;
  } {
    const organizationId =
      request.tenantContext?.organizationId ??
      this.parseNumericHeader(request.headers?.['x-org-id']);
    const companyId =
      request.tenantContext?.companyId ??
      this.parseNumericHeader(request.headers?.['x-company-id']);

    return {
      organizationId,
      companyId,
    };
  }

  private parseNumericHeader(
    value: string | string[] | number | undefined,
  ): number | null {
    if (Array.isArray(value)) {
      return this.parseNumericHeader(value[0]);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
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
