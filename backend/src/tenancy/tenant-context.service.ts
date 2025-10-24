import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

import { TenantContext } from './tenant-context.interface';

interface RequestUserPayload {
  id?: number;
  role?: string;
  organizations?: Array<number | string>;
  defaultOrganizationId?: number | string | null;
  companies?: Array<number | string>;
  companyIds?: Array<number | string>;
  defaultCompanyId?: number | string | null;
  isSuperAdmin?: boolean;
  organizationSuperAdminIds?: Array<number | string>;
  organizationUnits?: Array<number | string>;
  organizationUnitIds?: Array<number | string>;
  defaultOrganizationUnitId?: number | string | null;
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
      allowedOrganizationIds:
        partial.allowedOrganizationIds ?? this.context.allowedOrganizationIds,
      allowedCompanyIds:
        partial.allowedCompanyIds ?? this.context.allowedCompanyIds,
      allowedOrganizationUnitIds:
        partial.allowedOrganizationUnitIds ??
        this.context.allowedOrganizationUnitIds,
    };
  }

  private resolveContext(request: Request): TenantContext {
    const user = (request.user ?? {}) as RequestUserPayload;
    const headerOrgId = this.normalizeId(request.headers['x-org-id']);
    const defaultOrgId = this.normalizeId(user.defaultOrganizationId);
    const headerCompanyId = this.normalizeId(request.headers['x-company-id']);
    const defaultCompanyId = this.normalizeId(user.defaultCompanyId);
    const headerOrgUnitId = this.normalizeId(request.headers['x-org-unit-id']);
    const defaultOrgUnitId = this.normalizeId(user.defaultOrganizationUnitId);

    const allowedOrganizationIds = this.normalizeIdArray(user.organizations);
    const allowedCompanyIds = this.normalizeIdArray(
      user.companies ?? user.companyIds ?? [],
    );
    const allowedOrganizationUnitIds = this.normalizeIdArray(
      user.organizationUnits ?? user.organizationUnitIds ?? [],
    );
    const organizationSuperAdminIds = this.normalizeIdArray(
      user.organizationSuperAdminIds ?? [],
    );

    const normalizedRole = (user.role ?? '').toString().toUpperCase();
    const explicitSuperAdmin = Boolean(user.isSuperAdmin);
    const isGlobalSuperAdmin =
      normalizedRole === 'SUPER_ADMIN_GLOBAL' ||
      normalizedRole === 'SUPER_ADMIN' ||
      explicitSuperAdmin;
    const isOrganizationRole =
      normalizedRole === 'SUPER_ADMIN_ORG' || normalizedRole === 'SUPER_ADMIN';

    const organizationId =
      headerOrgId ?? defaultOrgId ?? allowedOrganizationIds[0] ?? null;
    const companyId =
      headerCompanyId ?? defaultCompanyId ?? allowedCompanyIds[0] ?? null;
    const organizationUnitId =
      headerOrgUnitId ??
      defaultOrgUnitId ??
      allowedOrganizationUnitIds[0] ??
      null;

    const isOrganizationSuperAdmin =
      organizationId !== null &&
      (organizationSuperAdminIds.includes(organizationId) ||
        isOrganizationRole);

    if (
      organizationId !== null &&
      allowedOrganizationIds.length > 0 &&
      !allowedOrganizationIds.includes(organizationId) &&
      !isGlobalSuperAdmin
    ) {
      throw new BadRequestException(
        `La organizacion ${organizationId} no esta autorizada para el usuario actual.`,
      );
    }

    if (
      companyId !== null &&
      organizationId === null &&
      !isGlobalSuperAdmin
    ) {
      throw new BadRequestException(
        'Debe especificar una organizacion valida antes de seleccionar una compania.',
      );
    }

    if (
      companyId !== null &&
      allowedCompanyIds.length > 0 &&
      !allowedCompanyIds.includes(companyId) &&
      !isGlobalSuperAdmin
    ) {
      throw new BadRequestException(
        `La compania ${companyId} no esta autorizada para el usuario actual.`,
      );
    }

    const context: TenantContext = {
      organizationId,
      companyId,
      organizationUnitId,
      userId: this.normalizeId(user.id),
      isGlobalSuperAdmin,
      isOrganizationSuperAdmin,
      isSuperAdmin: isGlobalSuperAdmin || isOrganizationSuperAdmin,
      allowedOrganizationIds,
      allowedCompanyIds,
      allowedOrganizationUnitIds,
    };

    return context;
  }

  private normalizeId(
    value: string | number | string[] | undefined | null,
  ): number | null {
    if (Array.isArray(value)) {
      return this.normalizeId(value[0]);
    }

    if (value === undefined || value === null) {
      return null;
    }

    const parsed =
      typeof value === 'string' ? Number.parseInt(value, 10) : value;
    return Number.isFinite(parsed) ? Number(parsed) : null;
  }

  private normalizeIdArray(values: unknown): number[] {
    if (!Array.isArray(values)) {
      return [];
    }

    const seen = new Set<number>();
    const normalized: number[] = [];

    for (const raw of values) {
      const id = this.normalizeId(raw);
      if (id === null || seen.has(id)) {
        continue;
      }
      seen.add(id);
      normalized.push(id);
    }

    return normalized;
  }
}
