import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { TenantContext } from './tenant-context.interface';

interface RequestWithTenantContext extends Request {
  user?: { role?: string };
  tenantContext?: TenantContext;
}

@Injectable()
export class GlobalSuperAdminGuard implements CanActivate {
  private readonly jwtService: JwtService;

  constructor(configService: ConfigService) {
    this.jwtService = new JwtService({
      secret: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithTenantContext>();

    if (!request) {
      throw new ForbiddenException('Global super admin privileges required.');
    }

    if (this.hasGlobalPrivileges(request)) {
      return true;
    }

    throw new ForbiddenException('Global super admin privileges required.');
  }

  private hasGlobalPrivileges(request: RequestWithTenantContext): boolean {
    const tenantContext = request.tenantContext;
    if (tenantContext?.isGlobalSuperAdmin) {
      return true;
    }

    const normalizedRole = this.normalizeRole(request.user?.role);
    if (normalizedRole && this.isGlobalRole(normalizedRole)) {
      this.ensureTenantContext(request, tenantContext, normalizedRole);
      return true;
    }

    const token = this.extractToken(request);
    if (!token) {
      return false;
    }

    try {
      const payload = this.jwtService.verify(token);
      const normalizedFromToken = this.normalizeRole(
        (payload as Record<string, unknown>)?.['role'],
      );

      if (normalizedFromToken && this.isGlobalRole(normalizedFromToken)) {
        request.user = { ...(request.user ?? {}), role: normalizedFromToken };
        this.ensureTenantContext(request, tenantContext, normalizedFromToken);
        return true;
      }

      const explicitFlag = Boolean(
        (payload as Record<string, unknown>)?.['isSuperAdmin'],
      );
      if (explicitFlag) {
        this.ensureTenantContext(
          request,
          tenantContext,
          'SUPER_ADMIN_GLOBAL',
        );
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  private extractToken(request: RequestWithTenantContext): string | undefined {
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

  private normalizeRole(role: unknown): string | undefined {
    if (typeof role !== 'string') {
      return undefined;
    }
    return role.toUpperCase();
  }

  private isGlobalRole(role: string): boolean {
    return role === 'SUPER_ADMIN_GLOBAL';
  }

  private ensureTenantContext(
    request: RequestWithTenantContext,
    tenantContext: TenantContext | undefined,
    role: string,
  ): void {
    const baseContext =
      tenantContext ??
      ({
        organizationId: null,
        organizationUnitId: null,
        userId: null,
        isGlobalSuperAdmin: false,
        isOrganizationSuperAdmin: false,
        isSuperAdmin: false,
        allowedOrganizationIds: [],
        allowedOrganizationUnitIds: [],
      } as TenantContext);

    request.tenantContext = {
      ...baseContext,
      isGlobalSuperAdmin: true,
      isSuperAdmin: true,
    };
    request.user = { ...(request.user ?? {}), role };
  }
}