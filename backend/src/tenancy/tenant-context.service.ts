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

export interface OrganizationFilter {
  organizationId?: number | null;
  companyId?: number | null;
  organizationUnitId?: number | null;
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

  /**
   * Construye un filtro de Prisma que incluye organizationId y companyId
   * según el contexto del tenant actual.
   * 
   * @param includeCompany - Si true, incluye companyId en el filtro
   * @param includeUnit - Si true, incluye organizationUnitId en el filtro
   * @returns Objeto de filtro compatible con Prisma where clauses
   */
  buildOrganizationFilter(
    includeCompany = true,
    includeUnit = false,
  ): OrganizationFilter {
    const filter: OrganizationFilter = {};

    // Incluir organizationId si existe
    if (this.context.organizationId !== null) {
      filter.organizationId = this.context.organizationId;
    }

    // Incluir companyId si se solicita y existe
    if (includeCompany && this.context.companyId !== null) {
      filter.companyId = this.context.companyId;
    }

    // Incluir organizationUnitId si se solicita y existe
    if (includeUnit && this.context.organizationUnitId !== null) {
      filter.organizationUnitId = this.context.organizationUnitId;
    }

    return filter;
  }

  /**
   * Resuelve y valida el companyId desde las cabeceras del request
   * contra los companyIds autorizados del usuario.
   * 
   * @returns companyId validado o null
   * @throws BadRequestException si el companyId no está autorizado
   */
  resolveCompanyId(): number | null {
    const { companyId, allowedCompanyIds, isGlobalSuperAdmin } = this.context;

    if (companyId === null) {
      return null;
    }

    // Super admins globales pueden acceder a cualquier compañía
    if (isGlobalSuperAdmin) {
      return companyId;
    }

    // Validar que el companyId esté en la lista de permitidos
    if (allowedCompanyIds.length > 0 && !allowedCompanyIds.includes(companyId)) {
      throw new BadRequestException(
        `La compañía ${companyId} no está autorizada para el usuario actual.`,
      );
    }

    return companyId;
  }

  /**
   * Resuelve y valida el organizationId desde las cabeceras del request
   */
  resolveOrganizationId(): number | null {
    return this.context.organizationId;
  }

  /**
   * Resuelve y valida el organizationUnitId desde las cabeceras del request
   */
  resolveOrganizationUnitId(): number | null {
    return this.context.organizationUnitId;
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

    // Validación: organizationId debe estar autorizado
    if (
      organizationId !== null &&
      allowedOrganizationIds.length > 0 &&
      !allowedOrganizationIds.includes(organizationId) &&
      !isGlobalSuperAdmin
    ) {
      throw new BadRequestException(
        `La organización ${organizationId} no está autorizada para el usuario actual.`,
      );
    }

    // Validación: companyId requiere organizationId válido
    if (
      companyId !== null &&
      organizationId === null &&
      !isGlobalSuperAdmin
    ) {
      throw new BadRequestException(
        'Debe especificar una organización válida antes de seleccionar una compañía.',
      );
    }

    // Validación: companyId debe estar autorizado
    if (
      companyId !== null &&
      allowedCompanyIds.length > 0 &&
      !allowedCompanyIds.includes(companyId) &&
      !isGlobalSuperAdmin
    ) {
      throw new BadRequestException(
        `La compañía ${companyId} no está autorizada para el usuario actual.`,
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