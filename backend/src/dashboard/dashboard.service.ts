import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
interface DashboardOverviewParams {
  entriesLimit: number;
  salesLimit: number;
  lowStockLimit: number;
  organizationId?: number | null;
  companyId?: number | null;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(params: DashboardOverviewParams) {
    const [
      inventoryTotals,
      lowStock,
      recentSales,
      recentEntries,
      monthlySales,
    ] = await Promise.all([
      this.fetchInventoryTotals(params),
      this.fetchLowStock(params),
      this.fetchRecentSales(params),
      this.fetchRecentEntries(params),
      this.fetchMonthlySalesTotals(params),
    ]);

    return {
      inventoryTotals,
      lowStock,
      recentSales,
      recentEntries,
      monthlySales,
    };
  }

  private async fetchInventoryTotals(params: DashboardOverviewParams) {
    const { organizationId, companyId } = params;

    const grouped = await this.prisma.storeOnInventory.groupBy({
      by: ['inventoryId'],
      _sum: { stock: true },
      where: {
        ...(companyId !== undefined
          ? { store: { companyId: companyId ?? null } }
          : {}),
        ...(organizationId !== undefined
          ? { inventory: { organizationId: organizationId ?? null } }
          : {}),
      },
    });

    const inventoryIds = grouped
      .map((group) => group.inventoryId)
      .filter((id): id is number => typeof id === 'number');

    if (inventoryIds.length === 0) {
      return [];
    }

    const inventories = await this.prisma.inventory.findMany({
      where: { id: { in: inventoryIds } },
      select: {
        id: true,
        product: { select: { id: true, name: true } },
      },
    });

    return grouped
      .map((group) => {
        if (!group.inventoryId) {
          return null;
        }
        const inventory = inventories.find(
          (inv) => inv.id === group.inventoryId,
        );
        return {
          inventoryId: group.inventoryId,
          name: inventory?.product?.name ?? `Inventario ${group.inventoryId}`,
          totalStock: group._sum?.stock ?? 0,
        };
      })
      .filter(
        (
          item,
        ): item is { inventoryId: number; name: string; totalStock: number } =>
          item !== null,
      );
  }

  private async fetchLowStock(params: DashboardOverviewParams) {
    const { organizationId, companyId, lowStockLimit } = params;

    const grouped = await this.prisma.storeOnInventory.groupBy({
      by: ['inventoryId'],
      _sum: { stock: true },
      where: {
        ...(companyId !== undefined
          ? { store: { companyId: companyId ?? null } }
          : {}),
        ...(organizationId !== undefined
          ? { inventory: { organizationId: organizationId ?? null } }
          : {}),
      },
      orderBy: { _sum: { stock: 'asc' } },
    });

    const inventoryIds = grouped
      .map((group) => group.inventoryId)
      .filter((id): id is number => typeof id === 'number');

    if (inventoryIds.length === 0) {
      return [];
    }

    const inventories = await this.prisma.inventory.findMany({
      where: { id: { in: inventoryIds } },
      select: {
        id: true,
        product: { select: { id: true, name: true } },
      },
    });

    return grouped
      .filter((group) => (group._sum?.stock ?? 0) <= 0)
      .slice(0, lowStockLimit)
      .map((group) => {
        const inventory = inventories.find(
          (inv) => inv.id === group.inventoryId,
        );
        return {
          inventoryId: group.inventoryId ?? 0,
          productId: inventory?.product?.id ?? group.inventoryId ?? 0,
          productName:
            inventory?.product?.name ?? `Inventario ${group.inventoryId ?? ''}`,
          totalStock: group._sum?.stock ?? 0,
        };
      });
  }

  private async fetchRecentSales(params: DashboardOverviewParams) {
    const { organizationId, companyId, salesLimit } = params;

    const where: Record<string, unknown> = {
      ...(organizationId !== undefined
        ? { organizationId: organizationId ?? null }
        : {}),
    };

    if (companyId !== undefined) {
      where.store = { companyId: companyId ?? null };
    }

    const sales = await this.prisma.sales.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: salesLimit,
      select: {
        id: true,
        total: true,
        createdAt: true,
        source: true,
      },
    });

    return sales;
  }

  private async fetchRecentEntries(params: DashboardOverviewParams) {
    const { organizationId, entriesLimit } = params;

    const where =
      organizationId !== undefined
        ? { organizationId: organizationId ?? null }
        : undefined;

    const entries = await this.prisma.entry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: entriesLimit,
      select: {
        id: true,
        createdAt: true,
        storeId: true,
        description: true,
      },
    });

    return entries;
  }

  private async fetchMonthlySalesTotals(params: DashboardOverviewParams) {
    const { organizationId, companyId } = params;
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(startOfCurrentMonth.getTime() - 1);

    const organizationFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    );

    const [currentMonth, previousMonth] = await Promise.all([
      this.prisma.sales.aggregate({
        _sum: { total: true },
        where: {
          ...(organizationFilter as Record<string, unknown>),
          createdAt: { gte: startOfCurrentMonth, lte: now },
        },
      }),
      this.prisma.sales.aggregate({
        _sum: { total: true },
        where: {
          ...(organizationFilter as Record<string, unknown>),
          createdAt: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
        },
      }),
    ]);

    const currentTotal = currentMonth._sum.total ?? 0;
    const previousTotal = previousMonth._sum.total ?? 0;
    const growth =
      previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : null;

    return {
      total: currentTotal,
      growth,
    };
  }
}
