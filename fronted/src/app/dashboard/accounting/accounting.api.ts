import { BACKEND_URL } from "@/lib/utils";
import { authFetch } from "@/utils/auth-fetch";
import type { AccountingSummary, PleExportParams } from "@/lib/accounting/types";

const EMPTY_SUMMARY: AccountingSummary = {
  cashAvailable: 0,
  cashBreakdown: { cash: 0, bank: 0 },
  cashGrowth: null,
  inventoryValue: 0,
  inventoryBreakdown: { merchandise: 0, productsInStock: 0 },
  inventoryGrowth: null,
  taxesPending: 0,
  taxBreakdown: { igvSales: 0, igvPurchases: 0, netIgv: 0 },
  taxDueDate: new Date().toISOString(),
  daysUntilDue: 0,
  netProfit: 0,
  profitBreakdown: { revenue: 0, costOfSales: 0, grossProfit: 0 },
  profitMargin: 0,
  profitGrowth: null,
  sparklines: {
    cash: [],
    inventory: [],
    taxes: [],
    profit: [],
  },
};

/**
 * Obtiene el resumen contable con las 4 métricas principales
 */
export async function fetchAccountingSummary(): Promise<AccountingSummary> {
  try {
    const res = await authFetch(`${BACKEND_URL}/api/accounting/summary`, {
      credentials: "include",
    });

    // Permisos insuficientes
    if (res.status === 403) {
      return EMPTY_SUMMARY;
    }

    if (!res.ok) {
      throw new Error("No se pudo obtener el resumen contable");
    }

    const payload = await res.json();
    return payload as AccountingSummary;
  } catch (error) {
    console.error("Error fetching accounting summary:", error);
    return EMPTY_SUMMARY;
  }
}

/**
 * Descarga archivo PLE (Libro Diario 5.1 o Libro Mayor 6.1)
 */
export async function downloadPleExport(params: PleExportParams): Promise<void> {
  try {
    const url = `${BACKEND_URL}/api/accounting/export/ple?period=${params.period}&format=${params.format}`;

    const res = await authFetch(url, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("No se pudo exportar el archivo PLE");
    }

    // Obtener el nombre del archivo del header Content-Disposition
    const contentDisposition = res.headers.get("Content-Disposition");
    let filename = `PLE_${params.format.replace('.', '_')}_${params.period}.txt`;

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Descargar archivo
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Error downloading PLE export:", error);
    throw error;
  }
}
