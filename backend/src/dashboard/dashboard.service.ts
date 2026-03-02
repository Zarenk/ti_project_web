import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
import {
  subDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  subQuarters,
  startOfQuarter,
  endOfQuarter,
  subYears,
  startOfYear,
  endOfYear,
} from 'date-fns';

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

  // ── Employee KPIs ──────────────────────────────────────────────────────

  async getEmployeeKPIs(params: {
    userId: number;
    period: 'month' | 'quarter' | 'year';
    organizationId?: number | null;
    companyId?: number | null;
  }) {
    const { userId, period, organizationId, companyId } = params;
    const now = new Date();

    const { currentStart, currentEnd, previousStart, previousEnd } =
      this.resolvePeriodRange(now, period);

    const orgFilter = buildOrganizationFilter(organizationId, companyId);

    const baseWhere = {
      userId,
      ...(orgFilter as Record<string, unknown>),
    };

    // Run all queries in parallel
    const [
      currentAgg,
      previousAgg,
      currentItemsSold,
      previousItemsSold,
      monthlySeries,
      ranking,
      topProducts,
    ] = await Promise.all([
      // Current period aggregate
      this.prisma.sales.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: {
          ...baseWhere,
          createdAt: { gte: currentStart, lte: currentEnd },
        },
      }),
      // Previous period aggregate
      this.prisma.sales.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: {
          ...baseWhere,
          createdAt: { gte: previousStart, lte: previousEnd },
        },
      }),
      // Current period items sold
      this.prisma.salesDetail.aggregate({
        _sum: { quantity: true },
        where: {
          sale: {
            ...baseWhere,
            createdAt: { gte: currentStart, lte: currentEnd },
          },
        },
      }),
      // Previous period items sold
      this.prisma.salesDetail.aggregate({
        _sum: { quantity: true },
        where: {
          sale: {
            ...baseWhere,
            createdAt: { gte: previousStart, lte: previousEnd },
          },
        },
      }),
      // Monthly series (last 12 months)
      this.fetchEmployeeMonthlySeries(userId, organizationId, companyId),
      // Ranking vs peers
      this.fetchEmployeeRanking(
        userId,
        currentStart,
        currentEnd,
        organizationId,
        companyId,
      ),
      // Top 5 products
      this.fetchEmployeeTopProducts(
        userId,
        currentStart,
        currentEnd,
        organizationId,
        companyId,
      ),
    ]);

    const currentSalesCount = currentAgg._count.id ?? 0;
    const currentRevenue = currentAgg._sum.total ?? 0;
    const previousSalesCount = previousAgg._count.id ?? 0;
    const previousRevenue = previousAgg._sum.total ?? 0;
    const currentItems = currentItemsSold._sum.quantity ?? 0;
    const previousItems = previousItemsSold._sum.quantity ?? 0;

    const avgTicket = currentSalesCount > 0 ? currentRevenue / currentSalesCount : 0;
    const prevAvgTicket =
      previousSalesCount > 0 ? previousRevenue / previousSalesCount : 0;

    const calcGrowth = (cur: number, prev: number) =>
      prev > 0 ? ((cur - prev) / prev) * 100 : null;

    return {
      currentPeriod: {
        salesCount: currentSalesCount,
        totalRevenue: Math.round(currentRevenue * 100) / 100,
        avgTicket: Math.round(avgTicket * 100) / 100,
        itemsSold: currentItems,
      },
      previousPeriod: {
        salesCount: previousSalesCount,
        totalRevenue: Math.round(previousRevenue * 100) / 100,
        avgTicket: Math.round(prevAvgTicket * 100) / 100,
        itemsSold: previousItems,
      },
      growth: {
        salesCount: calcGrowth(currentSalesCount, previousSalesCount),
        totalRevenue: calcGrowth(currentRevenue, previousRevenue),
        avgTicket: calcGrowth(avgTicket, prevAvgTicket),
        itemsSold: calcGrowth(currentItems, previousItems),
      },
      monthlySeries,
      ranking,
      topProducts,
    };
  }

  private resolvePeriodRange(
    now: Date,
    period: 'month' | 'quarter' | 'year',
  ) {
    switch (period) {
      case 'quarter': {
        const currentStart = startOfQuarter(now);
        const currentEnd = endOfDay(now);
        const prevQuarter = subQuarters(now, 1);
        const previousStart = startOfQuarter(prevQuarter);
        const previousEnd = endOfQuarter(prevQuarter);
        return { currentStart, currentEnd, previousStart, previousEnd };
      }
      case 'year': {
        const currentStart = startOfYear(now);
        const currentEnd = endOfDay(now);
        const prevYear = subYears(now, 1);
        const previousStart = startOfYear(prevYear);
        const previousEnd = endOfYear(prevYear);
        return { currentStart, currentEnd, previousStart, previousEnd };
      }
      default: {
        // month
        const currentStart = startOfMonth(now);
        const currentEnd = endOfDay(now);
        const prevMonth = subMonths(now, 1);
        const previousStart = startOfMonth(prevMonth);
        const previousEnd = endOfMonth(prevMonth);
        return { currentStart, currentEnd, previousStart, previousEnd };
      }
    }
  }

  private async fetchEmployeeMonthlySeries(
    userId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const now = new Date();
    const from = startOfMonth(subMonths(now, 11));
    const orgFilter = buildOrganizationFilter(organizationId, companyId);

    const sales = await this.prisma.sales.findMany({
      where: {
        userId,
        ...(orgFilter as Record<string, unknown>),
        createdAt: { gte: from },
      },
      select: { createdAt: true, total: true },
    });

    // Also fetch items sold
    const details = await this.prisma.salesDetail.findMany({
      where: {
        sale: {
          userId,
          ...(orgFilter as Record<string, unknown>),
          createdAt: { gte: from },
        },
      },
      select: { quantity: true, sale: { select: { createdAt: true } } },
    });

    // Build monthly buckets
    const months: { month: string; salesCount: number; revenue: number; itemsSold: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      months.push({
        month: format(d, 'yyyy-MM'),
        salesCount: 0,
        revenue: 0,
        itemsSold: 0,
      });
    }
    const monthMap = new Map(months.map((m) => [m.month, m]));

    for (const s of sales) {
      const key = format(s.createdAt, 'yyyy-MM');
      const bucket = monthMap.get(key);
      if (bucket) {
        bucket.salesCount++;
        bucket.revenue += s.total;
      }
    }
    for (const d of details) {
      const key = format(d.sale.createdAt, 'yyyy-MM');
      const bucket = monthMap.get(key);
      if (bucket) {
        bucket.itemsSold += d.quantity;
      }
    }

    // Round revenues
    for (const m of months) {
      m.revenue = Math.round(m.revenue * 100) / 100;
    }

    return months;
  }

  private async fetchEmployeeRanking(
    userId: number,
    from: Date,
    to: Date,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const orgFilter = buildOrganizationFilter(organizationId, companyId);

    // Get all sellers' revenue in the period
    const sellerRevenues = await this.prisma.sales.groupBy({
      by: ['userId'],
      _sum: { total: true },
      where: {
        ...(orgFilter as Record<string, unknown>),
        createdAt: { gte: from, lte: to },
      },
      orderBy: { _sum: { total: 'desc' } },
    });

    const totalSellers = sellerRevenues.length;
    const position =
      sellerRevenues.findIndex((s) => s.userId === userId) + 1 || totalSellers + 1;
    const topSellerRevenue = sellerRevenues[0]?._sum?.total ?? 0;
    const myRevenue =
      sellerRevenues.find((s) => s.userId === userId)?._sum?.total ?? 0;

    return {
      position,
      totalSellers,
      topSellerRevenue: Math.round(topSellerRevenue * 100) / 100,
      myRevenue: Math.round(myRevenue * 100) / 100,
    };
  }

  private async fetchEmployeeTopProducts(
    userId: number,
    from: Date,
    to: Date,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const orgFilter = buildOrganizationFilter(organizationId, companyId);

    const grouped = await this.prisma.salesDetail.groupBy({
      by: ['productId'],
      _sum: { quantity: true, price: true },
      _count: { id: true },
      where: {
        sale: {
          userId,
          ...(orgFilter as Record<string, unknown>),
          createdAt: { gte: from, lte: to },
        },
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    if (grouped.length === 0) return [];

    const productIds = grouped.map((g) => g.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return grouped.map((g) => {
      // Revenue = sum of (quantity * price) per detail — groupBy _sum.price sums individual prices
      // We need a different approach: use _count and average
      const totalQuantity = g._sum.quantity ?? 0;
      return {
        productId: g.productId,
        productName: productMap.get(g.productId) ?? `Producto ${g.productId}`,
        quantity: totalQuantity,
        salesCount: g._count.id ?? 0,
      };
    });
  }

  // ── Sparkline helpers ──

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
