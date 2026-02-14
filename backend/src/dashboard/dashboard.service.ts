import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
import { subDays, startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';

export interface SparklinePoint {
  date: string;
  value: number;
}

interface SparklineParams {
  days?: number;
  organizationId?: number | null;
  companyId?: number | null;
}

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

  // ── Sparklines ───────────────────────────────────────────────────────

  async getSparklines(params: SparklineParams) {
    const days = params.days ?? 30;
    const now = new Date();
    const from = startOfDay(subDays(now, days - 1));
    const to = endOfDay(now);
    const dateRange = eachDayOfInterval({ start: from, end: to });
    const dateKeys = dateRange.map((d) => format(d, 'yyyy-MM-dd'));

    const { organizationId, companyId } = params;

    const [
      salesByDay,
      entryQtyByProductDay,
      salesQtyByProductDay,
      currentStockByProduct,
      ordersByDay,
    ] = await Promise.all([
      this.fetchDailySalesTotals(from, to, organizationId, companyId),
      this.fetchDailyEntryQuantities(from, to, organizationId),
      this.fetchDailySalesQuantities(from, to, organizationId, companyId),
      this.fetchCurrentStockByProduct(organizationId, companyId),
      this.fetchDailyOrderCounts(from, to, params),
    ]);

    // ── Sales sparkline (simple aggregation) ──
    const sales: SparklinePoint[] = dateKeys.map((date) => ({
      date,
      value: salesByDay.get(date) ?? 0,
    }));

    // ── Reconstruct inventory total & out-of-stock per day ──
    // For each product, walk backwards from current stock
    const productIds = new Set<number>();
    for (const k of entryQtyByProductDay.keys()) productIds.add(k);
    for (const k of salesQtyByProductDay.keys()) productIds.add(k);
    for (const k of currentStockByProduct.keys()) productIds.add(k);

    // dailyTotalStock[dayIndex] = sum of all product stocks on that day
    const dailyTotalStock = new Array(dateKeys.length).fill(0);
    const dailyOutOfStock = new Array(dateKeys.length).fill(0);

    for (const pid of productIds) {
      const curStock = currentStockByProduct.get(pid) ?? 0;
      const entryMap = entryQtyByProductDay.get(pid);
      const salesMap = salesQtyByProductDay.get(pid);

      // Walk backwards: today is last index
      let stock = curStock;
      for (let i = dateKeys.length - 1; i >= 0; i--) {
        dailyTotalStock[i] += stock;
        if (stock <= 0) dailyOutOfStock[i]++;

        if (i > 0) {
          // Un-do today's movements to get yesterday's stock
          const dayKey = dateKeys[i];
          const added = entryMap?.get(dayKey) ?? 0;
          const removed = salesMap?.get(dayKey) ?? 0;
          stock = stock - added + removed;
        }
      }
    }

    const inventory: SparklinePoint[] = dateKeys.map((date, i) => ({
      date,
      value: dailyTotalStock[i],
    }));

    const outOfStock: SparklinePoint[] = dateKeys.map((date, i) => ({
      date,
      value: dailyOutOfStock[i],
    }));

    // ── Orders sparkline ──
    const pendingOrders: SparklinePoint[] = dateKeys.map((date) => ({
      date,
      value: ordersByDay.get(date) ?? 0,
    }));

    return { inventory, sales, outOfStock, pendingOrders };
  }

  // ── Sparkline helpers ──

  private async fetchDailySalesTotals(
    from: Date,
    to: Date,
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<Map<string, number>> {
    const where: Record<string, unknown> = {
      createdAt: { gte: from, lte: to },
    };
    if (organizationId !== undefined) {
      where.organizationId = organizationId ?? null;
    }
    if (companyId !== undefined) {
      where.store = { companyId: companyId ?? null };
    }
    const rows = await this.prisma.sales.findMany({
      where,
      select: { createdAt: true, total: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = format(r.createdAt, 'yyyy-MM-dd');
      map.set(key, (map.get(key) ?? 0) + r.total);
    }
    return map;
  }

  private async fetchDailyEntryQuantities(
    from: Date,
    to: Date,
    organizationId?: number | null,
  ): Promise<Map<number, Map<string, number>>> {
    const entryWhere: Record<string, unknown> = {
      createdAt: { gte: from, lte: to },
    };
    if (organizationId !== undefined) {
      entryWhere.organizationId = organizationId ?? null;
    }
    const rows = await this.prisma.entryDetail.findMany({
      where: { entry: entryWhere },
      select: {
        productId: true,
        quantity: true,
        entry: { select: { createdAt: true } },
      },
    });
    const map = new Map<number, Map<string, number>>();
    for (const r of rows) {
      const key = format(r.entry.createdAt, 'yyyy-MM-dd');
      if (!map.has(r.productId)) map.set(r.productId, new Map());
      const pMap = map.get(r.productId)!;
      pMap.set(key, (pMap.get(key) ?? 0) + r.quantity);
    }
    return map;
  }

  private async fetchDailySalesQuantities(
    from: Date,
    to: Date,
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<Map<number, Map<string, number>>> {
    const saleWhere: Record<string, unknown> = {
      createdAt: { gte: from, lte: to },
    };
    if (organizationId !== undefined) {
      saleWhere.organizationId = organizationId ?? null;
    }
    if (companyId !== undefined) {
      saleWhere.store = { companyId: companyId ?? null };
    }
    const rows = await this.prisma.salesDetail.findMany({
      where: { sale: saleWhere },
      select: {
        productId: true,
        quantity: true,
        sale: { select: { createdAt: true } },
      },
    });
    const map = new Map<number, Map<string, number>>();
    for (const r of rows) {
      const key = format(r.sale.createdAt, 'yyyy-MM-dd');
      if (!map.has(r.productId)) map.set(r.productId, new Map());
      const pMap = map.get(r.productId)!;
      pMap.set(key, (pMap.get(key) ?? 0) + r.quantity);
    }
    return map;
  }

  private async fetchCurrentStockByProduct(
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<Map<number, number>> {
    const inventoryWhere: Record<string, unknown> = {};
    if (organizationId !== undefined) {
      inventoryWhere.inventory = {
        organizationId: organizationId ?? null,
      };
    }
    if (companyId !== undefined) {
      inventoryWhere.store = { companyId: companyId ?? null };
    }

    const rows = await this.prisma.storeOnInventory.findMany({
      where: inventoryWhere,
      select: {
        stock: true,
        inventory: { select: { productId: true } },
      },
    });

    const map = new Map<number, number>();
    for (const r of rows) {
      const pid = r.inventory.productId;
      map.set(pid, (map.get(pid) ?? 0) + r.stock);
    }
    return map;
  }

  private async fetchDailyOrderCounts(
    from: Date,
    to: Date,
    params: SparklineParams,
  ): Promise<Map<string, number>> {
    const where: Record<string, unknown> = {
      createdAt: { gte: from, lte: to },
    };
    if (params.organizationId !== undefined) {
      where.organizationId = params.organizationId ?? null;
    }
    if (params.companyId !== undefined) {
      where.companyId = params.companyId ?? null;
    }

    const rows = await this.prisma.orders.findMany({
      where,
      select: { createdAt: true },
    });

    const map = new Map<string, number>();
    for (const r of rows) {
      const key = format(r.createdAt, 'yyyy-MM-dd');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }
}
