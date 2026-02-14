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
      this.calculateCash(orgId, companyId, currentMonthStart, currentMonthEnd, previousMonthStart, previousMonthEnd),
      this.calculateInventory(orgId, companyId, currentMonthStart, currentMonthEnd, previousMonthStart, previousMonthEnd),
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
    currentStart: Date,
    currentEnd: Date,
    prevStart: Date,
    prevEnd: Date,
  ) {
    // Obtener balance de cuentas 1011 (Caja) y 1041 (Bancos)
    const currentCash = await this.getAccountBalance('1011', orgId, companyId, currentEnd);
    const currentBank = await this.getAccountBalance('1041', orgId, companyId, currentEnd);
    const cashAvailable = currentCash + currentBank;

    // Balance del mes anterior para calcular crecimiento
    const prevCash = await this.getAccountBalance('1011', orgId, companyId, prevEnd);
    const prevBank = await this.getAccountBalance('1041', orgId, companyId, prevEnd);
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
    currentStart: Date,
    currentEnd: Date,
    prevStart: Date,
    prevEnd: Date,
  ) {
    // Balance cuenta 2011 (Mercaderías)
    const inventoryValue = await this.getAccountBalance('2011', orgId, companyId, currentEnd);

    // Contar productos en stock
    const productsInStock = await this.prisma.inventory.count({
      where: {
        organizationId: orgId,
        companyId,
        totalStock: { gt: 0 },
      },
    });

    const prevInventoryValue = await this.getAccountBalance('2011', orgId, companyId, prevEnd);
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
    // Balance cuenta 4011 (IGV por pagar)
    const igvBalance = await this.getAccountBalance('4011', orgId, companyId, currentEnd);

    // Desglosar IGV de ventas vs compras del mes actual
    const igvMovements = await this.prisma.accEntryLine.groupBy({
      by: [],
      where: {
        account: '4011',
        entry: {
          organizationId: orgId,
          companyId,
          date: { gte: currentStart, lte: currentEnd },
          status: 'POSTED',
        },
      },
      _sum: { debit: true, credit: true },
    });

    const igvPurchases = Number((igvMovements[0]?._sum?.debit || 0));
    const igvSales = Number((igvMovements[0]?._sum?.credit || 0));
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
    // Ingresos (cuenta 7011 - Ventas)
    const revenue = await this.getAccountMovements('7011', orgId, companyId, currentStart, currentEnd, 'credit');

    // Costo de ventas (cuenta 6911)
    const costOfSales = await this.getAccountMovements('6911', orgId, companyId, currentStart, currentEnd, 'debit');

    const grossProfit = revenue - costOfSales;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // Calcular ganancia del mes anterior
    const prevRevenue = await this.getAccountMovements('7011', orgId, companyId, prevStart, prevEnd, 'credit');
    const prevCostOfSales = await this.getAccountMovements('6911', orgId, companyId, prevStart, prevEnd, 'debit');
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
    const points: any = { cash: [], inventory: [], taxes: [], profit: [] };
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const [cash, bank, inventory, igv, revenue, cost] = await Promise.all([
        this.getAccountBalance('1011', orgId, companyId, date),
        this.getAccountBalance('1041', orgId, companyId, date),
        this.getAccountBalance('2011', orgId, companyId, date),
        this.getAccountBalance('4011', orgId, companyId, date),
        this.getAccountMovements('7011', orgId, companyId, startOfMonth(date), date, 'credit'),
        this.getAccountMovements('6911', orgId, companyId, startOfMonth(date), date, 'debit'),
      ]);

      points.cash.push({ date: dateStr, value: Number((cash + bank).toFixed(2)) });
      points.inventory.push({ date: dateStr, value: Number(inventory.toFixed(2)) });
      points.taxes.push({ date: dateStr, value: Number(Math.max(0, igv).toFixed(2)) });
      points.profit.push({ date: dateStr, value: Number((revenue - cost).toFixed(2)) });
    }

    return points;
  }

  // Helper: Obtener balance de cuenta a una fecha específica
  private async getAccountBalance(
    account: string,
    orgId: number | null,
    companyId: number | null,
    asOfDate: Date,
  ): Promise<number> {
    const result = await this.prisma.accEntryLine.aggregate({
      where: {
        account,
        entry: {
          organizationId: orgId,
          companyId,
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
    if (account.startsWith('1') || account.startsWith('2') || account.startsWith('6')) {
      return debit - credit;
    } else {
      return credit - debit;
    }
  }

  // Helper: Obtener movimientos de cuenta en período
  private async getAccountMovements(
    account: string,
    orgId: number | null,
    companyId: number | null,
    from: Date,
    to: Date,
    side: 'debit' | 'credit',
  ): Promise<number> {
    const result = await this.prisma.accEntryLine.aggregate({
      where: {
        account,
        entry: {
          organizationId: orgId,
          companyId,
          date: { gte: from, lte: to },
          status: 'POSTED',
        },
      },
      _sum: { [side]: true },
    });

    return Number(result._sum[side] || 0);
  }
}
