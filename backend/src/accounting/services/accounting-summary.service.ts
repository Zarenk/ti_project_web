import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from 'date-fns';

export interface SparklinePoint {
  date: string;
  value: number;
}

export interface AccountingSummary {
  // Métrica 1: Dinero disponible
  cashAvailable: number;
  cashBreakdown: { cash: number; bank: number };
  cashGrowth: number | null;

  // Métrica 2: Inventario
  inventoryValue: number;
  inventoryBreakdown: { merchandise: number; productsInStock: number };
  inventoryGrowth: number | null;

  // Métrica 3: Impuestos por pagar
  taxesPending: number;
  taxBreakdown: { igvSales: number; igvPurchases: number; netIgv: number };
  taxDueDate: string;
  daysUntilDue: number;

  // Métrica 4: Ganancia del mes
  netProfit: number;
  profitBreakdown: { revenue: number; costOfSales: number; grossProfit: number };
  profitMargin: number;
  profitGrowth: number | null;

  // Sparklines (últimos 30 días)
  sparklines: {
    cash: SparklinePoint[];
    inventory: SparklinePoint[];
    taxes: SparklinePoint[];
    profit: SparklinePoint[];
  };
}

@Injectable()
export class AccountingSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateSummary(tenant?: TenantContext | null): Promise<AccountingSummary> {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const orgId = tenant?.organizationId ?? null;
    const companyId = tenant?.companyId ?? null;

    // Calcular cada métrica en paralelo
    const [
      cashData,
      inventoryData,
      taxData,
      profitData,
      sparklineData,
    ] = await Promise.all([
      this.calculateCash(orgId, companyId, currentMonthEnd, previousMonthEnd),
      this.calculateInventory(orgId, companyId, currentMonthEnd, previousMonthEnd),
      this.calculateTaxes(orgId, companyId, currentMonthStart, currentMonthEnd),
      this.calculateProfit(orgId, companyId, currentMonthStart, currentMonthEnd, previousMonthStart, previousMonthEnd),
      this.calculateSparklines(orgId, companyId, 30),
    ]);

    return {
      ...cashData,
      ...inventoryData,
      ...taxData,
      ...profitData,
      sparklines: sparklineData,
    };
  }

  private async calculateCash(
    orgId: number | null,
    companyId: number | null,
    currentEnd: Date,
    prevEnd: Date,
  ) {
    // Obtener balance de cuentas que inician con 101 (Caja) y 104 (Bancos)
    const [currentCash, currentBank, prevCash, prevBank] = await Promise.all([
      this.getAccountBalance('101', orgId, companyId, currentEnd),
      this.getAccountBalance('104', orgId, companyId, currentEnd),
      this.getAccountBalance('101', orgId, companyId, prevEnd),
      this.getAccountBalance('104', orgId, companyId, prevEnd),
    ]);

    const cashAvailable = currentCash + currentBank;
    const prevCashAvailable = prevCash + prevBank;

    const cashGrowth = prevCashAvailable > 0
      ? ((cashAvailable - prevCashAvailable) / prevCashAvailable) * 100
      : null;

    return {
      cashAvailable: Number(cashAvailable.toFixed(2)),
      cashBreakdown: {
        cash: Number(currentCash.toFixed(2)),
        bank: Number(currentBank.toFixed(2))
      },
      cashGrowth: cashGrowth !== null ? Number(cashGrowth.toFixed(2)) : null,
    };
  }

  private async calculateInventory(
    orgId: number | null,
    companyId: number | null,
    currentEnd: Date,
    prevEnd: Date,
  ) {
    // Balance cuentas que inician con 201 (Mercaderías)
    const [inventoryValue, prevInventoryValue, productsInStock] = await Promise.all([
      this.getAccountBalance('201', orgId, companyId, currentEnd),
      this.getAccountBalance('201', orgId, companyId, prevEnd),
      this.prisma.inventory.count({
        where: { organizationId: orgId ?? undefined },
      }),
    ]);

    const inventoryGrowth = prevInventoryValue > 0
      ? ((inventoryValue - prevInventoryValue) / prevInventoryValue) * 100
      : null;

    return {
      inventoryValue: Number(inventoryValue.toFixed(2)),
      inventoryBreakdown: {
        merchandise: Number(inventoryValue.toFixed(2)),
        productsInStock
      },
      inventoryGrowth: inventoryGrowth !== null ? Number(inventoryGrowth.toFixed(2)) : null,
    };
  }

  private async calculateTaxes(
    orgId: number | null,
    companyId: number | null,
    currentStart: Date,
    currentEnd: Date,
  ) {
    // Desglosar IGV de ventas vs compras del mes actual
    const igvMovements = await this.prisma.journalLine.aggregate({
      where: {
        account: {
          code: { startsWith: '401' },
          organizationId: orgId ?? undefined,
        },
        entry: {
          organizationId: orgId ?? undefined,
          ...(companyId ? { companyId } : {}),
          date: { gte: currentStart, lte: currentEnd },
          status: 'POSTED',
        },
      },
      _sum: { debit: true, credit: true },
    });

    const igvPurchases = Number(igvMovements._sum?.debit || 0);
    const igvSales = Number(igvMovements._sum?.credit || 0);
    const netIgv = igvSales - igvPurchases;

    // Fecha de vencimiento: día 18 del mes siguiente
    const nextMonth = new Date(currentEnd);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const taxDueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 18);
    const daysUntilDue = differenceInDays(taxDueDate, new Date());

    return {
      taxesPending: Number(Math.max(0, netIgv).toFixed(2)),
      taxBreakdown: {
        igvSales: Number(igvSales.toFixed(2)),
        igvPurchases: Number(igvPurchases.toFixed(2)),
        netIgv: Number(netIgv.toFixed(2))
      },
      taxDueDate: taxDueDate.toISOString(),
      daysUntilDue: Math.max(0, daysUntilDue),
    };
  }

  private async calculateProfit(
    orgId: number | null,
    companyId: number | null,
    currentStart: Date,
    currentEnd: Date,
    prevStart: Date,
    prevEnd: Date,
  ) {
    // Ingresos (cuentas 701 - Ventas) y Costo de ventas (cuentas 691)
    const [revenue, costOfSales, prevRevenue, prevCostOfSales] = await Promise.all([
      this.getAccountMovements('701', orgId, companyId, currentStart, currentEnd, 'credit'),
      this.getAccountMovements('691', orgId, companyId, currentStart, currentEnd, 'debit'),
      this.getAccountMovements('701', orgId, companyId, prevStart, prevEnd, 'credit'),
      this.getAccountMovements('691', orgId, companyId, prevStart, prevEnd, 'debit'),
    ]);

    const grossProfit = revenue - costOfSales;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const prevGrossProfit = prevRevenue - prevCostOfSales;
    const profitGrowth = prevGrossProfit > 0
      ? ((grossProfit - prevGrossProfit) / Math.abs(prevGrossProfit)) * 100
      : null;

    return {
      netProfit: Number(grossProfit.toFixed(2)),
      profitBreakdown: {
        revenue: Number(revenue.toFixed(2)),
        costOfSales: Number(costOfSales.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2))
      },
      profitMargin: Number(profitMargin.toFixed(2)),
      profitGrowth: profitGrowth !== null ? Number(profitGrowth.toFixed(2)) : null,
    };
  }

  private async calculateSparklines(
    orgId: number | null,
    companyId: number | null,
    days: number,
  ) {
    const now = new Date();
    const sparklineStart = new Date(now);
    sparklineStart.setDate(sparklineStart.getDate() - days);

    // Obtener balances iniciales (un día antes del período de sparkline)
    const dayBeforeStart = new Date(sparklineStart);
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);

    const [initialCash, initialBank, initialInventory, initialIgv] = await Promise.all([
      this.getAccountBalance('101', orgId, companyId, dayBeforeStart),
      this.getAccountBalance('104', orgId, companyId, dayBeforeStart),
      this.getAccountBalance('201', orgId, companyId, dayBeforeStart),
      this.getAccountBalance('401', orgId, companyId, dayBeforeStart),
    ]);

    // Obtener todos los movimientos diarios en el período en una sola consulta
    const accountPrefixes = ['101', '104', '201', '401', '691', '701'];
    const dailyMovements = await this.prisma.journalLine.findMany({
      where: {
        OR: accountPrefixes.map((prefix) => ({
          account: {
            code: { startsWith: prefix },
            organizationId: orgId ?? undefined,
          },
        })),
        entry: {
          organizationId: orgId ?? undefined,
          ...(companyId ? { companyId } : {}),
          date: { gte: sparklineStart, lte: now },
          status: 'POSTED',
        },
      },
      select: {
        debit: true,
        credit: true,
        account: { select: { code: true } },
        entry: { select: { date: true } },
      },
    });

    // Agrupar movimientos por fecha y prefijo de cuenta
    const dailyMap = new Map<string, {
      cash: { debit: number; credit: number };
      bank: { debit: number; credit: number };
      inventory: { debit: number; credit: number };
      igv: { debit: number; credit: number };
      revenue: { debit: number; credit: number };
      cost: { debit: number; credit: number };
    }>();

    for (const line of dailyMovements) {
      const dateStr = format(new Date(line.entry.date), 'yyyy-MM-dd');
      const code = line.account.code;

      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          cash: { debit: 0, credit: 0 },
          bank: { debit: 0, credit: 0 },
          inventory: { debit: 0, credit: 0 },
          igv: { debit: 0, credit: 0 },
          revenue: { debit: 0, credit: 0 },
          cost: { debit: 0, credit: 0 },
        });
      }

      const day = dailyMap.get(dateStr)!;
      const debit = Number(line.debit);
      const credit = Number(line.credit);

      if (code.startsWith('101')) {
        day.cash.debit += debit;
        day.cash.credit += credit;
      } else if (code.startsWith('104')) {
        day.bank.debit += debit;
        day.bank.credit += credit;
      } else if (code.startsWith('201')) {
        day.inventory.debit += debit;
        day.inventory.credit += credit;
      } else if (code.startsWith('401')) {
        day.igv.debit += debit;
        day.igv.credit += credit;
      } else if (code.startsWith('701')) {
        day.revenue.debit += debit;
        day.revenue.credit += credit;
      } else if (code.startsWith('691')) {
        day.cost.debit += debit;
        day.cost.credit += credit;
      }
    }

    // Construir sparklines acumulativas
    const points: {
      cash: SparklinePoint[];
      inventory: SparklinePoint[];
      taxes: SparklinePoint[];
      profit: SparklinePoint[];
    } = { cash: [], inventory: [], taxes: [], profit: [] };

    let runCash = initialCash;
    let runBank = initialBank;
    let runInventory = initialInventory;
    let runIgv = initialIgv;

    for (let i = 0; i < days; i++) {
      const date = new Date(sparklineStart);
      date.setDate(date.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayData = dailyMap.get(dateStr);
      if (dayData) {
        // Activo: debit - credit
        runCash += dayData.cash.debit - dayData.cash.credit;
        runBank += dayData.bank.debit - dayData.bank.credit;
        runInventory += dayData.inventory.debit - dayData.inventory.credit;
        // Pasivo/ingreso: credit - debit
        runIgv += dayData.igv.credit - dayData.igv.debit;
      }

      points.cash.push({ date: dateStr, value: Number((runCash + runBank).toFixed(2)) });
      points.inventory.push({ date: dateStr, value: Number(runInventory.toFixed(2)) });
      points.taxes.push({ date: dateStr, value: Number(Math.max(0, runIgv).toFixed(2)) });

      // Para profit usamos MTD (month-to-date) del mes correspondiente a esta fecha
      const monthStart = startOfMonth(date);
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');

      // Acumular revenue y cost desde inicio del mes
      let monthRevenue = 0;
      let monthCost = 0;
      for (const [dStr, dData] of dailyMap.entries()) {
        if (dStr >= monthStartStr && dStr <= dateStr) {
          monthRevenue += dData.revenue.credit;
          monthCost += dData.cost.debit;
        }
      }

      points.profit.push({ date: dateStr, value: Number((monthRevenue - monthCost).toFixed(2)) });
    }

    return points;
  }

  // Helper: Obtener balance de cuenta a una fecha específica (usa JournalLine)
  private async getAccountBalance(
    accountCodePrefix: string,
    orgId: number | null,
    companyId: number | null,
    asOfDate: Date,
  ): Promise<number> {
    const result = await this.prisma.journalLine.aggregate({
      where: {
        account: {
          code: { startsWith: accountCodePrefix },
          organizationId: orgId ?? undefined,
        },
        entry: {
          organizationId: orgId ?? undefined,
          ...(companyId ? { companyId } : {}),
          date: { lte: asOfDate },
          status: 'POSTED',
        },
      },
      _sum: { debit: true, credit: true },
    });

    const debit = Number(result._sum.debit || 0);
    const credit = Number(result._sum.credit || 0);

    // Cuentas de activo (1xxx, 2xxx): debit - credit
    // Cuentas de pasivo/ingreso (4xxx, 7xxx): credit - debit
    // Cuentas de gasto (6xxx): debit - credit
    if (accountCodePrefix.startsWith('1') || accountCodePrefix.startsWith('2') || accountCodePrefix.startsWith('6')) {
      return debit - credit;
    } else {
      return credit - debit;
    }
  }

  // Helper: Obtener movimientos de cuenta en período (usa JournalLine)
  private async getAccountMovements(
    accountCodePrefix: string,
    orgId: number | null,
    companyId: number | null,
    from: Date,
    to: Date,
    side: 'debit' | 'credit',
  ): Promise<number> {
    const result = await this.prisma.journalLine.aggregate({
      where: {
        account: {
          code: { startsWith: accountCodePrefix },
          organizationId: orgId ?? undefined,
        },
        entry: {
          organizationId: orgId ?? undefined,
          ...(companyId ? { companyId } : {}),
          date: { gte: from, lte: to },
          status: 'POSTED',
        },
      },
      _sum: { [side]: true },
    });

    return Number(result._sum[side] || 0);
  }
}
