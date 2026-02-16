import { BadRequestException, Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

import { TenantContext } from './tenant-context.interface';

interface RequestUserPayload {
  id?: number;
  userId?: number;
  sub?: number;
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
  private context: TenantContext | null = null;
  private readonly logger = new Logger(TenantContextService.name);

  constructor(@Inject(REQUEST) private readonly request: Request) {
    // context se calcula perezosamente mediante getContext()
  }

  getContext(): TenantContext {
    const requestUser = (this.request.user ?? {}) as RequestUserPayload;
    const requestUserId = this.normalizeId(
      requestUser.id ?? requestUser.userId ?? requestUser.sub,
    );
    const current = this.context;

    let shouldRecompute = false;
    if (current === null) {
      shouldRecompute = true;
    } else if (requestUserId !== null && current.userId === null) {
      shouldRecompute = true;
    } else if (
      requestUserId !== null &&
      current.userId !== null &&
      current.userId !== requestUserId
    ) {
      shouldRecompute = true;
    }

    if (shouldRecompute) {
      this.context = this.resolveContext(this.request);
    }
    return this.context!;
  }

  getContextWithFallback(): TenantContext {
    try {
      return this.getContext();
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        throw error;
      }
      const fallback = this.resolveContext(this.request, {
        allowFallback: true,
      });
      this.context = fallback;
      return fallback;
    }
  }

  updateContext(partial: Partial<TenantContext>): void {
    const current = this.getContext();
    this.context = {
      ...current,
      ...partial,
      allowedOrganizationIds:
        partial.allowedOrganizationIds ?? current.allowedOrganizationIds,
      allowedCompanyIds: partial.allowedCompanyIds ?? current.allowedCompanyIds,
      allowedOrganizationUnitIds:
        partial.allowedOrganizationUnitIds ??
        current.allowedOrganizationUnitIds,
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
    const context = this.getContext();
    const filter: OrganizationFilter = {};

    // Incluir organizationId si existe
    if (context.organizationId !== null) {
      filter.organizationId = context.organizationId;
    }

    // Incluir companyId si se solicita y existe
    if (includeCompany && context.companyId !== null) {
      filter.companyId = context.companyId;
    }

    // Incluir organizationUnitId si se solicita y existe
    if (includeUnit && context.organizationUnitId !== null) {
      filter.organizationUnitId = context.organizationUnitId;
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
    const { companyId, allowedCompanyIds, isGlobalSuperAdmin } =
      this.getContext();

    if (companyId === null) {
      return null;
    }

    // Super admins globales pueden acceder a cualquier compañía
    if (isGlobalSuperAdmin) {
      return companyId;
    }

    // Validar que el companyId esté en la lista de permitidos
    if (
      allowedCompanyIds.length > 0 &&
      !allowedCompanyIds.includes(companyId)
    ) {
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
    return this.getContext().organizationId;
  }

  /**
   * Resuelve y valida el organizationUnitId desde las cabeceras del request
   */
  resolveOrganizationUnitId(): number | null {
    return this.getContext().organizationUnitId;
  }

  private resolveContext(
    request: Request,
    options?: { allowFallback?: boolean },
  ): TenantContext {
    const allowFallback = options?.allowFallback ?? false;
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

    const normalizedRole = (user.role ?? '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
    const explicitSuperAdmin = Boolean(user.isSuperAdmin);
    const isGlobalSuperAdmin =
      normalizedRole === 'SUPER_ADMIN_GLOBAL' ||
      normalizedRole === 'SUPER_ADMIN' ||
      explicitSuperAdmin;
    
    this.logger.debug(
      `[buildContext] User role detection: user.role=${user.role}, normalizedRole=${normalizedRole}, ` +
      `isGlobalSuperAdmin=${isGlobalSuperAdmin}, explicitSuperAdmin=${explicitSuperAdmin}`
    );
    const isOrganizationRole =
      normalizedRole === 'SUPER_ADMIN_ORG' || normalizedRole === 'SUPER_ADMIN';

    let organizationId: number | null =
      headerOrgId ?? defaultOrgId ?? allowedOrganizationIds[0] ?? null;

    let companyId: number | null =
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

    if (!isGlobalSuperAdmin && !isOrganizationSuperAdmin) {
      const fallbackOrganizationId = allowedOrganizationIds[0] ?? null;
      const fallbackCompanyId = allowedCompanyIds[0] ?? null;

      if (
        organizationId !== null &&
        allowedOrganizationIds.length > 0 &&
        !allowedOrganizationIds.includes(organizationId)
      ) {
        organizationId = fallbackOrganizationId;
      }

      if (organizationId === null && allowedOrganizationIds.length > 0) {
        organizationId = fallbackOrganizationId;
      }

      if (
        companyId !== null &&
        allowedCompanyIds.length > 0 &&
        !allowedCompanyIds.includes(companyId)
      ) {
        companyId = fallbackCompanyId;
      }

      if (companyId !== null && organizationId === null) {
        if (fallbackOrganizationId !== null) {
          organizationId = fallbackOrganizationId;
        } else {
          companyId = null;
        }
      }

      if (
        (organizationId === null && allowedOrganizationIds.length === 0) ||
        (companyId === null && allowedCompanyIds.length === 0)
      ) {
        if (allowFallback) {
          organizationId = fallbackOrganizationId ?? null;
          companyId = fallbackCompanyId ?? null;
        } else if (
          organizationId === null &&
          companyId !== null &&
          allowedCompanyIds.length > 0
        ) {
          companyId = allowedCompanyIds.includes(companyId)
            ? companyId
            : (allowedCompanyIds[0] ?? null);
        }
      }
    }

    const context: TenantContext = {
      organizationId,
      companyId,
      organizationUnitId,
      userId: this.normalizeId(user.id ?? user.userId ?? user.sub),
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
