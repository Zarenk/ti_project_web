import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

import { TenantContext } from './tenant-context.interface';

interface RequestUserPayload {
  id?: number;
  role?: string;
  organizations?: Array<number | string>;
  defaultOrganizationId?: number | string | null;
  isSuperAdmin?: boolean;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private context: TenantContext;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    this.context = this.resolveContext(request);
  }

  getContext(): TenantContext {
    return this.context;
  }

  updateContext(partial: Partial<TenantContext>): void {
    this.context = {
      ...this.context,
      ...partial,
      allowedOrganizationIds: partial.allowedOrganizationIds ?? this.context.allowedOrganizationIds,
    };
  }

  private resolveContext(request: Request): TenantContext {
    const user = (request.user ?? {}) as RequestUserPayload;
    const headerOrgId = this.normalizeId(request.headers['x-org-id']);
    const defaultOrgId = this.normalizeId(user.defaultOrganizationId);

    const allowedOrganizationIds = Array.isArray(user.organizations)
      ? user.organizations
          .map((value) => this.normalizeId(value))
          .filter((value): value is number => value !== null)
      : [];

    const organizationId = headerOrgId ?? defaultOrgId ?? allowedOrganizationIds[0] ?? null;

    const context: TenantContext = {
      organizationId,
      organizationUnitId: null,
      userId: this.normalizeId(user.id),
      isSuperAdmin: Boolean(user.isSuperAdmin || (user.role && user.role.toLowerCase() === 'super_admin')),
      allowedOrganizationIds,
    };

    return context;
  }

  private normalizeId(value: string | number | string[] | undefined | null): number | null {
    if (Array.isArray(value)) {
      return this.normalizeId(value[0]);
    }

    if (value === undefined || value === null) {
      return null;
    }

    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;
    return Number.isFinite(parsed) ? Number(parsed) : null;
  }
}