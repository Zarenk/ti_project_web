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

export interface PleExportParams {
  period: string; // "2026-02"
  format: '5.1' | '6.1';
}
