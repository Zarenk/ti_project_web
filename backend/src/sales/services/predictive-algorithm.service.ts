import { Injectable, Logger } from '@nestjs/common';

interface DataPoint {
  x: number;
  y: number;
}

interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

interface MonthProjection {
  current: number;
  projected: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  daysAnalyzed: number;
  daysRemaining: number;
}

@Injectable()
export class PredictiveAlgorithmService {
  private readonly logger = new Logger(PredictiveAlgorithmService.name);

  /**
   * Calcula regresión lineal simple: y = mx + b
   * @param data Array de puntos {x, y}
   * @returns { slope, intercept, r2 }
   */
  private linearRegression(data: DataPoint[]): LinearRegressionResult {
    const n = data.length;

    if (n < 2) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    const sumX = data.reduce((sum, p) => sum + p.x, 0);
    const sumY = data.reduce((sum, p) => sum + p.y, 0);
    const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);

    // Calcular pendiente (m) e intercepto (b)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcular R² (coeficiente de determinación)
    const yMean = sumY / n;
    const ssTotal = data.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
    const ssResidual = data.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);

    const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return {
      slope: isNaN(slope) ? 0 : slope,
      intercept: isNaN(intercept) ? 0 : intercept,
      r2: isNaN(r2) ? 0 : Math.max(0, Math.min(1, r2)),
    };
  }

  /**
   * Proyecta las utilidades del mes actual basándose en datos históricos
   * @param dailyProfits Array de { date: Date, profit: number }
   * @param currentMonth Fecha del mes actual
   * @returns MonthProjection
   */
  projectMonthlyProfit(
    dailyProfits: { date: Date; profit: number }[],
    currentMonth: Date = new Date(),
  ): MonthProjection {
    try {
      if (dailyProfits.length === 0) {
        return {
          current: 0,
          projected: 0,
          confidence: 0,
          trend: 'stable',
          daysAnalyzed: 0,
          daysRemaining: 0,
        };
      }

      // Convertir a puntos de datos para regresión (x = día desde inicio, y = profit)
      const startDate = dailyProfits[0].date;
      const dataPoints: DataPoint[] = dailyProfits.map((dp, index) => ({
        x: index + 1,
        y: dp.profit,
      }));

      // Calcular regresión lineal
      const regression = this.linearRegression(dataPoints);

      // Calcular utilidad actual (suma de todos los días hasta hoy)
      const currentProfit = dailyProfits.reduce(
        (sum, dp) => sum + dp.profit,
        0,
      );

      // Determinar días del mes actual
      const now = new Date();
      const daysElapsed = now.getDate();
      const daysInMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
      ).getDate();
      const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

      // Proyectar días restantes usando la tendencia
      let projectedAdditional = 0;
      if (daysRemaining > 0 && regression.slope !== 0) {
        // Proyectar desde el último día conocido
        const lastX = dataPoints.length;
        for (let i = 1; i <= daysRemaining; i++) {
          const projectedProfit = regression.slope * (lastX + i) + regression.intercept;
          projectedAdditional += Math.max(0, projectedProfit);
        }
      }

      const projectedTotal = currentProfit + projectedAdditional;

      // Determinar tendencia
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (regression.slope > 0.01) trend = 'up';
      else if (regression.slope < -0.01) trend = 'down';

      return {
        current: Math.round(currentProfit * 100) / 100,
        projected: Math.round(projectedTotal * 100) / 100,
        confidence: Math.round(regression.r2 * 100) / 100,
        trend,
        daysAnalyzed: dailyProfits.length,
        daysRemaining,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error en projectMonthlyProfit: ${message}`,
        stack,
      );
      return {
        current: 0,
        projected: 0,
        confidence: 0,
        trend: 'stable',
        daysAnalyzed: 0,
        daysRemaining: 0,
      };
    }
  }

  /**
   * Agrupa datos de ventas por día y calcula utilidad diaria
   * @param sales Array de ventas con detalles
   * @returns Array de { date, profit }
   */
  groupSalesByDay(
    sales: {
      createdAt: Date;
      details: { quantity: number; price: number; product: { avgCost?: number } }[];
    }[],
  ): { date: Date; profit: number }[] {
    const dailyMap = new Map<string, number>();

    sales.forEach((sale) => {
      const dateKey = sale.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

      const saleProfit = sale.details.reduce((sum, detail) => {
        const revenue = detail.quantity * detail.price;
        const cost = detail.quantity * (detail.product.avgCost || 0);
        return sum + (revenue - cost);
      }, 0);

      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + saleProfit);
    });

    // Convertir a array ordenado por fecha
    return Array.from(dailyMap.entries())
      .map(([dateStr, profit]) => ({
        date: new Date(dateStr),
        profit,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
