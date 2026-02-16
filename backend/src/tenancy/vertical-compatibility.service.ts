import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CashRegisterStatus,
  OrderStatus,
  Prisma,
  PrismaClient,
  SaleSource,
} from '@prisma/client';
import { subMinutes } from 'date-fns';

import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessVertical } from 'src/types/business-vertical.enum';

export interface DataImpactTable {
  name: string;
  recordCount: number;
  willBeHidden: boolean;
  willBeMigrated: boolean;
  backupRecommended: boolean;
}

export interface DataImpactAnalysis {
  tables: DataImpactTable[];
  customFields: Array<{
    entity: string;
    field: string;
    willBeRemoved: boolean;
  }>;
  integrations: string[];
}

export interface VerticalCompatibilityResult {
  isCompatible: boolean;
  errors: string[];
  warnings: string[];
  requiresMigration: boolean;
  affectedModules: string[];
  estimatedDowntime: number;
  dataImpact: DataImpactAnalysis;
}

@Injectable()
export class VerticalCompatibilityService {
  constructor(private readonly prisma: PrismaService) {}

  private isJsonObject(
    value: Prisma.JsonValue | null | undefined,
  ): value is Prisma.JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async countLegacyProducts(
    prisma: PrismaClient,
    companyId: number,
  ): Promise<number> {
    return prisma.product.count({
      where: {
        companyId,
        OR: [
          { extraAttributes: { equals: Prisma.JsonNull } },
          { isVerticalMigrated: false },
        ],
      },
    });
  }

  async check(
    companyId: number,
    from: BusinessVertical,
    to: BusinessVertical,
  ): Promise<VerticalCompatibilityResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const affectedModules = new Set<string>();

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, organizationId: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    const [
      productCount,
      legacyProducts,
      inventoryCount,
      pendingOrders,
      recentPosSales,
      openCashRegisters,
      productionProcesses,
      siteSettings,
      organizationSettings,
    ] = await Promise.all([
      this.prisma.product.count({ where: { companyId } }),
      this.countLegacyProducts(this.prisma, companyId),
      this.prisma.inventory.count({
        where: { product: { companyId } },
      }),
      this.prisma.orders.count({
        where: {
          companyId,
          status: { in: [OrderStatus.PENDING] },
        },
      }),
      this.prisma.sales.count({
        where: {
          companyId,
          source: SaleSource.POS,
          createdAt: { gte: subMinutes(new Date(), 15) },
        },
      }),
      this.prisma.cashRegister.count({
        where: {
          store: { companyId },
          status: CashRegisterStatus.ACTIVE,
        },
      }),
      this.prisma.inventoryHistory.count({
        where: {
          companyId,
          action: { in: ['production', 'work_order', 'manufacturing'] },
          createdAt: { gte: subMinutes(new Date(), 60) },
        },
      }),
      this.prisma.siteSettings.findFirst({
        where: {
          OR: [
            { companyId },
            { companyId: null, organizationId: company.organizationId },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        select: { data: true },
      }),
      this.prisma.organizationSetting.findUnique({
        where: { organizationId: company.organizationId },
        select: { preferences: true },
      }),
    ]);

    if (from === to) {
      warnings.push('La empresa ya utiliza este vertical.');
    }

    if (
      from === BusinessVertical.RESTAURANTS &&
      to !== BusinessVertical.RESTAURANTS &&
      pendingOrders > 0
    ) {
      errors.push(
        `Existen ${pendingOrders} ordenes activas que deben completarse antes de cambiar de vertical.`,
      );
      affectedModules.add('kitchenDisplay');
      affectedModules.add('tableManagement');
    }

    if (to === BusinessVertical.RETAIL && legacyProducts > 0) {
      warnings.push(
        `Se detectaron ${legacyProducts} productos sin variantes (talla/color). Ejecuta la migracion antes de confirmar.`,
      );
      affectedModules.add('inventory');
      affectedModules.add('sales');
    }

    if (to === BusinessVertical.SERVICES && inventoryCount > 0) {
      warnings.push(
        `El vertical de Servicios no gestiona inventario fisico. ${inventoryCount} registros pasaran a modo solo lectura.`,
      );
      affectedModules.add('inventory');
    }

    const siteSettingsData = this.isJsonObject(siteSettings?.data)
      ? siteSettings?.data
      : null;
    const preferencesData = this.isJsonObject(organizationSettings?.preferences)
      ? organizationSettings?.preferences
      : null;

    const enabledModules = this.collectEnabledModules([
      siteSettingsData,
      preferencesData,
    ]);
    enabledModules.forEach((module) => affectedModules.add(module));
    if (enabledModules.length > 0) {
      warnings.push(
        `Se detectaron modulos habilitados (${enabledModules.join(
          ', ',
        )}). Verifica que sigan disponibles en el nuevo vertical.`,
      );
    }

    const activeIntegrations = this.collectIntegrations(siteSettingsData);
    if (activeIntegrations.length > 0) {
      warnings.push(
        `Integraciones activas detectadas (${activeIntegrations.join(
          ', ',
        )}). Confirma que sean compatibles con el nuevo vertical.`,
      );
    }

    const customFields = [
      ...this.collectCustomFields(siteSettingsData),
      ...this.collectCustomFields(preferencesData),
    ];

    if (recentPosSales > 0) {
      warnings.push(
        `Hay ${recentPosSales} ventas POS recientes. Asegurate de cerrarlas antes de migrar.`,
      );
      affectedModules.add('sales');
    }
    if (openCashRegisters > 0) {
      errors.push(
        `Se encontraron ${openCashRegisters} cajas activas. Debes cerrarlas antes de cambiar de vertical.`,
      );
      affectedModules.add('cashregister');
    }
    if (productionProcesses > 0) {
      warnings.push(
        `Existen ${productionProcesses} procesos de produccion en curso.`,
      );
      affectedModules.add('production');
    }

    const dataImpact: DataImpactAnalysis = {
      tables: [
        {
          name: 'products',
          recordCount: productCount,
          willBeHidden: false,
          willBeMigrated: legacyProducts > 0,
          backupRecommended: legacyProducts > 0,
        },
        {
          name: 'inventory',
          recordCount: inventoryCount,
          willBeHidden: to === BusinessVertical.SERVICES,
          willBeMigrated: to === BusinessVertical.RETAIL,
          backupRecommended: inventoryCount > 0,
        },
      ],
      customFields,
      integrations: activeIntegrations,
    };

    if (to === BusinessVertical.RETAIL) {
      dataImpact.customFields.push(
        { entity: 'product', field: 'size', willBeRemoved: false },
        { entity: 'product', field: 'color', willBeRemoved: false },
      );
    }

    if (to === BusinessVertical.RESTAURANTS) {
      dataImpact.customFields.push({
        entity: 'product',
        field: 'kitchen_station',
        willBeRemoved: false,
      });
    }

    let estimatedDowntime = 5;
    estimatedDowntime += Math.min(legacyProducts, 1000) / 40;
    estimatedDowntime += pendingOrders > 0 ? 10 : 0;
    estimatedDowntime = Math.round(estimatedDowntime);

    const requiresMigration =
      legacyProducts > 0 ||
      inventoryCount > 0 ||
      pendingOrders > 0 ||
      customFields.length > 0 ||
      recentPosSales > 0 ||
      productionProcesses > 0;

    return {
      isCompatible: errors.length === 0,
      errors,
      warnings,
      requiresMigration,
      affectedModules: Array.from(affectedModules),
      estimatedDowntime,
      dataImpact,
    };
  }

  private collectEnabledModules(
    sources: Array<Prisma.JsonObject | null>,
  ): string[] {
    const modules = new Set<string>();
    for (const source of sources) {
      if (!source) continue;
      const permissionsValue = source['permissions'] as
        | Prisma.JsonValue
        | undefined;
      if (!this.isJsonObject(permissionsValue)) {
        continue;
      }
      for (const [name, enabled] of Object.entries(permissionsValue)) {
        if (enabled === true) {
          modules.add(name);
        }
      }
    }
    return Array.from(modules);
  }

  private collectIntegrations(
    settings: Prisma.JsonObject | null,
  ): string[] {
    if (!settings) {
      return [];
    }
    const integrationsValue = settings['integrations'] as
      | Prisma.JsonValue
      | undefined;
    if (!this.isJsonObject(integrationsValue)) {
      return [];
    }
    const active: string[] = [];
    for (const [name, value] of Object.entries(integrationsValue)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        active.push(name);
      } else if (typeof value === 'boolean' && value) {
        active.push(name);
      }
    }
    return active;
  }

  private collectCustomFields(
    settings: Prisma.JsonObject | null,
  ): DataImpactAnalysis['customFields'] {
    if (!settings) {
      return [];
    }
    const raw = settings['customFields'] as Prisma.JsonValue | undefined;
    if (!Array.isArray(raw)) {
      return [];
    }
    const output: DataImpactAnalysis['customFields'] = [];
    for (const entry of raw) {
      if (!this.isJsonObject(entry)) continue;
      const entityValue = entry['entity'];
      const fieldValue = entry['field'] ?? entry['name'];
      if (typeof entityValue !== 'string' || typeof fieldValue !== 'string') {
        continue;
      }
      output.push({
        entity: entityValue,
        field: fieldValue,
        willBeRemoved: false,
      });
    }
    return output;
  }
}
