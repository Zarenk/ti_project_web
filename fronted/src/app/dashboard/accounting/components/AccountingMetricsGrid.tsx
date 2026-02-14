'use client';

import { DashboardMetricCard } from '@/components/dashboard-metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountingSummary } from '../hooks/useAccountingSummary';
import { DollarSign, Package, Receipt, TrendingUp } from 'lucide-react';
import { EducationalTooltip } from './EducationalTooltip';
import { MetricWithBreakdown } from './MetricWithBreakdown';

export function AccountingMetricsGrid() {
  const { summary, loading, error } = useAccountingSummary();

  // Loading state
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-[160px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          No se pudo cargar el resumen contable. Por favor, intenta nuevamente.
        </p>
      </div>
    );
  }

  // Empty state (no summary)
  if (!summary) {
    return null;
  }

  // Calcular badge de crecimiento
  const getCashGrowthBadge = () => {
    if (summary.cashGrowth === null) return null;
    const isPositive = summary.cashGrowth > 0;
    return {
      text: `${isPositive ? '+' : ''}${summary.cashGrowth.toFixed(1)}%`,
      color: isPositive ? 'text-emerald-600' : 'text-red-600',
    };
  };

  const getInventoryGrowthBadge = () => {
    if (summary.inventoryGrowth === null) return null;
    const isPositive = summary.inventoryGrowth > 0;
    return {
      text: `${isPositive ? '+' : ''}${summary.inventoryGrowth.toFixed(1)}%`,
      color: isPositive ? 'text-emerald-600' : 'text-red-600',
    };
  };

  const getProfitGrowthBadge = () => {
    if (summary.profitGrowth === null) return null;
    const isPositive = summary.profitGrowth > 0;
    return {
      text: `${isPositive ? '+' : ''}${summary.profitGrowth.toFixed(1)}%`,
      color: isPositive ? 'text-emerald-600' : 'text-red-600',
    };
  };

  const cashGrowth = getCashGrowthBadge();
  const inventoryGrowth = getInventoryGrowthBadge();
  const profitGrowth = getProfitGrowthBadge();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Métrica 1: Dinero Disponible */}
      <DashboardMetricCard
        title={
          <div className="flex items-center gap-1.5">
            <span>Dinero disponible</span>
            <EducationalTooltip term="cash" />
          </div>
        }
        icon={<DollarSign className="h-4 w-4" />}
        value={
          <MetricWithBreakdown
            value={`S/ ${summary.cashAvailable.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            breakdown={{
              'Caja': `S/ ${summary.cashBreakdown.cash.toFixed(2)}`,
              'Bancos': `S/ ${summary.cashBreakdown.bank.toFixed(2)}`,
            }}
          />
        }
        subtitle={
          cashGrowth ? (
            <span className={cashGrowth.color}>
              {cashGrowth.text} vs mes anterior
            </span>
          ) : (
            'Efectivo + Bancos'
          )
        }
        data={summary.sparklines.cash}
        color="blue"
      />

      {/* Métrica 2: Valor del Inventario */}
      <DashboardMetricCard
        title={
          <div className="flex items-center gap-1.5">
            <span>Tu inventario vale</span>
            <EducationalTooltip term="inventory" />
          </div>
        }
        icon={<Package className="h-4 w-4" />}
        value={
          <MetricWithBreakdown
            value={`S/ ${summary.inventoryValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            breakdown={{
              'Valor mercaderías': `S/ ${summary.inventoryBreakdown.merchandise.toFixed(2)}`,
              'Productos en stock': summary.inventoryBreakdown.productsInStock.toString(),
            }}
          />
        }
        subtitle={
          inventoryGrowth ? (
            <span className={inventoryGrowth.color}>
              {inventoryGrowth.text} vs mes anterior
            </span>
          ) : (
            'Mercadería en almacén'
          )
        }
        data={summary.sparklines.inventory}
        color="emerald"
      />

      {/* Métrica 3: Impuestos por Pagar */}
      <DashboardMetricCard
        title={
          <div className="flex items-center gap-1.5">
            <span>Impuestos por pagar</span>
            <EducationalTooltip term="igv" />
          </div>
        }
        icon={<Receipt className="h-4 w-4" />}
        value={
          <MetricWithBreakdown
            value={`S/ ${summary.taxesPending.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            breakdown={{
              'IGV ventas': `S/ ${summary.taxBreakdown.igvSales.toFixed(2)}`,
              'IGV compras': `S/ ${summary.taxBreakdown.igvPurchases.toFixed(2)}`,
              'IGV neto': `S/ ${summary.taxBreakdown.netIgv.toFixed(2)}`,
            }}
          />
        }
        subtitle={
          summary.daysUntilDue <= 5 ? (
            <span className="text-amber-600 font-medium">
              Vence en {summary.daysUntilDue === 0 ? 'HOY' : summary.daysUntilDue === 1 ? '1 día' : `${summary.daysUntilDue} días`}
            </span>
          ) : (
            `Vence ${new Date(summary.taxDueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
          )
        }
        data={summary.sparklines.taxes}
        color="amber"
      />

      {/* Métrica 4: Ganancia del Mes */}
      <DashboardMetricCard
        title={
          <div className="flex items-center gap-1.5">
            <span>Ganancia del mes</span>
            <EducationalTooltip term="profit" />
          </div>
        }
        icon={<TrendingUp className="h-4 w-4" />}
        value={
          <MetricWithBreakdown
            value={
              <span className={summary.netProfit < 0 ? 'text-red-600' : ''}>
                S/ {Math.abs(summary.netProfit).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {summary.netProfit < 0 && ' pérdida'}
              </span>
            }
            breakdown={{
              'Ingresos': `S/ ${summary.profitBreakdown.revenue.toFixed(2)}`,
              'Costo ventas': `S/ ${summary.profitBreakdown.costOfSales.toFixed(2)}`,
              'Margen': `${summary.profitMargin.toFixed(1)}%`,
            }}
          />
        }
        subtitle={
          profitGrowth ? (
            <span className={profitGrowth.color}>
              {profitGrowth.text} vs mes anterior
            </span>
          ) : (
            `Margen: ${summary.profitMargin.toFixed(1)}%`
          )
        }
        data={summary.sparklines.profit}
        color="violet"
      />
    </div>
  );
}
