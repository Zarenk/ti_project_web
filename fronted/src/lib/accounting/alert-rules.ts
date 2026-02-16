import type { AccountingSummary } from './types';

export type AlertType = 'urgent' | 'warning' | 'info';

export interface AccountingAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
}

/**
 * Genera alertas inteligentes basadas en el resumen contable
 */
export function generateAccountingAlerts(
  summary: AccountingSummary,
  onExportClick?: () => void
): AccountingAlert[] {
  const alerts: AccountingAlert[] = [];

  // Regla 1: IGV próximo a vencer (urgente)
  if (summary.daysUntilDue <= 5 && summary.taxesPending > 0) {
    const daysText = summary.daysUntilDue === 0 ? 'HOY' :
                     summary.daysUntilDue === 1 ? 'mañana' :
                     `en ${summary.daysUntilDue} días`;

    alerts.push({
      id: 'igv-due-soon',
      type: 'urgent',
      title: '⚠️ IGV por vencer',
      message: `Tienes que pagar S/ ${summary.taxesPending.toFixed(2)} de IGV ${daysText}. Exporta tu libro electrónico para SUNAT ahora.`,
      action: onExportClick ? {
        label: 'Exportar para SUNAT',
        onClick: onExportClick,
      } : undefined,
      dismissible: false,
    });
  }

  // Regla 2: Inventario supera efectivo disponible (advertencia)
  if (summary.inventoryValue > summary.cashAvailable * 2) {
    alerts.push({
      id: 'inventory-vs-cash',
      type: 'warning',
      title: '💡 Mucho inventario, poco efectivo',
      message: `Tu inventario vale S/ ${summary.inventoryValue.toFixed(2)} pero solo tienes S/ ${summary.cashAvailable.toFixed(2)} disponible. Considera vender más antes de comprar.`,
      dismissible: true,
    });
  }

  // Regla 3: Ganancia negativa (advertencia)
  if (summary.netProfit < 0) {
    const loss = Math.abs(summary.netProfit);
    alerts.push({
      id: 'negative-profit',
      type: 'warning',
      title: '📉 Pérdidas este mes',
      message: `Estás perdiendo S/ ${loss.toFixed(2)} este mes. Tus costos (S/ ${summary.profitBreakdown.costOfSales.toFixed(2)}) superan tus ingresos (S/ ${summary.profitBreakdown.revenue.toFixed(2)}).`,
      dismissible: true,
    });
  }

  // Regla 4: Margen de ganancia bajo (info)
  if (summary.profitMargin > 0 && summary.profitMargin < 15) {
    alerts.push({
      id: 'low-margin',
      type: 'info',
      title: '💰 Margen de ganancia bajo',
      message: `Tu margen es ${summary.profitMargin.toFixed(1)}%. Lo ideal es tener al menos 20-30%. Considera ajustar tus precios de venta.`,
      dismissible: true,
    });
  }

  // Regla 5: Crecimiento positivo de ganancias (info positivo)
  if (summary.profitGrowth && summary.profitGrowth > 10) {
    alerts.push({
      id: 'profit-growth',
      type: 'info',
      title: '🎉 ¡Vas muy bien!',
      message: `Tus ganancias crecieron ${summary.profitGrowth.toFixed(1)}% vs el mes pasado. Sigue así!`,
      dismissible: true,
    });
  }

  return alerts;
}

/**
 * Gestiona alertas descartadas usando localStorage
 */
export class AlertDismissalManager {
  private static STORAGE_KEY = 'dismissed-accounting-alerts';

  static isDismissed(alertId: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const dismissed = localStorage.getItem(this.STORAGE_KEY);
      if (!dismissed) return false;

      const dismissedList: string[] = JSON.parse(dismissed);
      return dismissedList.includes(alertId);
    } catch {
      return false;
    }
  }

  static dismiss(alertId: string): void {
    if (typeof window === 'undefined') return;

    try {
      const dismissed = localStorage.getItem(this.STORAGE_KEY);
      const dismissedList: string[] = dismissed ? JSON.parse(dismissed) : [];

      if (!dismissedList.includes(alertId)) {
        dismissedList.push(alertId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dismissedList));
      }
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  }

  static clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
