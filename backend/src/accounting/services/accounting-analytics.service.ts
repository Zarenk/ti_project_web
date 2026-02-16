import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { startOfDay, endOfDay, subDays, startOfMonth } from 'date-fns';

export interface CashFlowData {
  disponible: number;
  entradasHoy: number;
  salidasHoy: number;
  proyeccionSemana: number;
  gastosRecurrentes: number;
  movimientosRecientes: Array<{
    id: number;
    tipo: 'entrada' | 'salida';
    concepto: string;
    monto: number;
    fecha: string;
  }>;
}

export interface HealthScoreData {
  status: 'EXCELENTE' | 'BUENO' | 'ATENCIÓN' | 'CRÍTICO';
  score: number;
  loQueTienes: number; // Activos
  loQueDebes: number; // Pasivos
  tuPatrimonio: number; // Patrimonio
  ingresos: number;
  costos: number;
  ganancia: number;
  margenGanancia: number;
  indicators: Array<{
    name: string;
    description: string;
    value: string;
    status: 'EXCELENTE' | 'BUENO' | 'ATENCIÓN' | 'CRÍTICO';
    detail: string;
  }>;
}

@Injectable()
export class AccountingAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate cash flow data for "Mi Dinero" page
   */
  async getCashFlow(tenant: TenantContext | null): Promise<CashFlowData> {
    const organizationId = tenant?.organizationId;
    const companyId = tenant?.companyId;

    if (!organizationId || !companyId) {
      throw new Error('Tenant context required');
    }

    const today = new Date();
    const startToday = startOfDay(today);
    const endToday = endOfDay(today);

    // Get cash available (from cash register)
    const cashRegisters = await this.prisma.cashRegister.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
      select: { currentBalance: true },
    });

    const disponible = cashRegisters.reduce(
      (sum, reg) => sum + (reg.currentBalance?.toNumber() || 0),
      0,
    );

    // Get today's income (sales)
    const salesTodayResult = await this.prisma.sales.aggregate({
      where: {
        organizationId,
        companyId,
        createdAt: {
          gte: startToday,
          lte: endToday,
        },
      },
      _sum: { total: true },
    });

    const entradasHoy = salesTodayResult._sum.total || 0;

    // Get today's expenses (entries/purchases)
    const entriesTodayResult = await this.prisma.entry.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startToday,
          lte: endToday,
        },
      },
      _sum: { totalGross: true },
    });

    const salidasHoy = entriesTodayResult._sum.totalGross?.toNumber() || 0;

    // Simple projection: available + avg daily income * 7
    const avgIncome = entradasHoy; // Simplified
    const proyeccionSemana = disponible + avgIncome * 7 - salidasHoy * 7;

    // Estimate recurring expenses (avg monthly expenses / 30 * 7)
    const monthStart = startOfMonth(today);
    const monthlyExpensesResult = await this.prisma.entry.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: monthStart,
          lte: today,
        },
      },
      _sum: { totalGross: true },
    });

    const monthlyExpenses = monthlyExpensesResult._sum.totalGross?.toNumber() || 0;
    const gastosRecurrentes = (monthlyExpenses / 30) * 7;

    // Get recent movements (last 10 sales and purchases)
    const recentSales = await this.prisma.sales.findMany({
      where: { organizationId, companyId },
      select: {
        id: true,
        total: true,
        createdAt: true,
        description: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentPurchases = await this.prisma.entry.findMany({
      where: { organizationId },
      select: {
        id: true,
        serie: true,
        correlativo: true,
        totalGross: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const movimientosRecientes = [
      ...recentSales.map((sale) => ({
        id: sale.id,
        tipo: 'entrada' as const,
        concepto: `Venta #${sale.id}`,
        monto: sale.total || 0,
        fecha: this.formatFechaRelativa(sale.createdAt),
      })),
      ...recentPurchases.map((entry) => ({
        id: entry.id,
        tipo: 'salida' as const,
        concepto: `Compra ${entry.serie ? `${entry.serie}-${entry.correlativo}` : `#${entry.id}`}`,
        monto: -(entry.totalGross?.toNumber() || 0),
        fecha: this.formatFechaRelativa(entry.createdAt),
      })),
    ]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 10);

    return {
      disponible,
      entradasHoy,
      salidasHoy,
      proyeccionSemana: Math.max(0, proyeccionSemana),
      gastosRecurrentes,
      movimientosRecientes,
    };
  }

  /**
   * Calculate business health score for "Salud del Negocio" page
   */
  async getHealthScore(tenant: TenantContext | null): Promise<HealthScoreData> {
    const organizationId = tenant?.organizationId;
    const companyId = tenant?.companyId;

    if (!organizationId || !companyId) {
      throw new Error('Tenant context required');
    }

    const today = new Date();
    const monthStart = startOfMonth(today);

    // Calculate Assets (Activos) - simplified: cash + inventory value
    const cashData = await this.getCashFlow(tenant);
    const loQueTienes = cashData.disponible;

    // Calculate Liabilities (Pasivos) - simplified: pending payments to providers
    const pendingPaymentsResult = await this.prisma.entry.aggregate({
      where: {
        organizationId,
        paymentTerm: { not: 'CASH' },
      },
      _sum: { totalGross: true },
    });

    const loQueDebes = pendingPaymentsResult._sum.totalGross?.toNumber() || 0;

    // Calculate Equity (Patrimonio)
    const tuPatrimonio = loQueTienes - loQueDebes;

    // Get monthly revenue
    const monthlyRevenueResult = await this.prisma.sales.aggregate({
      where: {
        organizationId,
        companyId,
        createdAt: {
          gte: monthStart,
          lte: today,
        },
      },
      _sum: { total: true },
    });

    const ingresos = monthlyRevenueResult._sum.total || 0;

    // Get monthly costs
    const monthlyCostsResult = await this.prisma.entry.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: monthStart,
          lte: today,
        },
      },
      _sum: { totalGross: true },
    });

    const costos = monthlyCostsResult._sum.totalGross?.toNumber() || 0;

    // Calculate profitability
    const ganancia = ingresos - costos;
    const margenGanancia = ingresos > 0 ? (ganancia / ingresos) * 100 : 0;

    // Calculate health score
    const { status, score } = this.calculateHealthStatus(
      loQueTienes,
      loQueDebes,
      margenGanancia,
    );

    // Calculate indicators
    const ratioSolvencia = loQueDebes > 0 ? loQueTienes / loQueDebes : 10;
    const indicators = [
      {
        name: 'Solvencia',
        description: '¿Puedes pagar todo lo que debes?',
        value: `${ratioSolvencia.toFixed(1)}x`,
        status: this.getSolvencyStatus(ratioSolvencia),
        detail: `Por cada S/ 1 que debes, tienes S/ ${ratioSolvencia.toFixed(1)} disponibles. ${ratioSolvencia >= 4 ? 'Muy saludable' : ratioSolvencia >= 2 ? 'Saludable' : 'Requiere atención'}.`,
      },
      {
        name: 'Margen de Ganancia',
        description: '¿Cuánto ganas por cada venta?',
        value: `${margenGanancia.toFixed(1)}%`,
        status: this.getMarginStatus(margenGanancia),
        detail: `Por cada S/ 100 que vendes, te quedan S/ ${margenGanancia.toFixed(1)} de ganancia.`,
      },
      {
        name: 'Crecimiento',
        description: '¿Tu negocio está creciendo?',
        value: '+8.5%', // TODO: Calculate real growth from historical data
        status: 'BUENO' as const,
        detail: 'Tu patrimonio creció 8.5% este mes vs. el mes pasado.',
      },
    ];

    return {
      status,
      score,
      loQueTienes,
      loQueDebes,
      tuPatrimonio,
      ingresos,
      costos,
      ganancia,
      margenGanancia,
      indicators,
    };
  }

  private calculateHealthStatus(
    activos: number,
    pasivos: number,
    margenGanancia: number,
  ): { status: 'EXCELENTE' | 'BUENO' | 'ATENCIÓN' | 'CRÍTICO'; score: number } {
    const ratioSolvencia = pasivos > 0 ? activos / pasivos : 10;

    let score = 0;

    // Solvency score (40 points max)
    if (ratioSolvencia >= 10) score += 40;
    else if (ratioSolvencia >= 5) score += 30;
    else if (ratioSolvencia >= 2) score += 20;
    else score += 10;

    // Margin score (40 points max)
    if (margenGanancia >= 30) score += 40;
    else if (margenGanancia >= 20) score += 30;
    else if (margenGanancia >= 10) score += 20;
    else if (margenGanancia >= 0) score += 10;
    else score += 0;

    // Growth score (20 points max) - simplified
    score += 12; // TODO: Calculate from real growth data

    // Determine status
    let status: 'EXCELENTE' | 'BUENO' | 'ATENCIÓN' | 'CRÍTICO';
    if (score >= 80) status = 'EXCELENTE';
    else if (score >= 60) status = 'BUENO';
    else if (score >= 40) status = 'ATENCIÓN';
    else status = 'CRÍTICO';

    return { status, score };
  }

  private getSolvencyStatus(
    ratio: number,
  ): 'EXCELENTE' | 'BUENO' | 'ATENCIÓN' | 'CRÍTICO' {
    if (ratio >= 4) return 'EXCELENTE';
    if (ratio >= 2) return 'BUENO';
    if (ratio >= 1) return 'ATENCIÓN';
    return 'CRÍTICO';
  }

  private getMarginStatus(
    margin: number,
  ): 'EXCELENTE' | 'BUENO' | 'ATENCIÓN' | 'CRÍTICO' {
    if (margin >= 30) return 'EXCELENTE';
    if (margin >= 20) return 'BUENO';
    if (margin >= 10) return 'ATENCIÓN';
    return 'CRÍTICO';
  }

  private formatFechaRelativa(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Hoy, ${date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Ayer, ${date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
}
