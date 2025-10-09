"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSalesColumns, Sale } from "./columns";
import { DataTable } from "./data-table";
import { getSaleById, getSales } from "./sales.api";
import { SaleDetailDialog } from "./components/sale-detail-dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const dynamic = "force-dynamic"; // PARA HACER LA PAGINA DINAMICA

const parseNumberValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const normalizeSaleDetail = (
  detail: any,
): NonNullable<Sale["details"]>[number] => {
  const productFromEntry = detail.entryDetail?.product;
  const productFromInventory = detail.storeOnInventory?.inventory?.product;
  const product = productFromEntry || productFromInventory || detail.product || null;

  const resolvedName =
    detail.productName ??
    detail.product_name ??
    product?.name ??
    product?.productName ??
    product?.nombre ??
    undefined;

  const resolvedSku =
    detail.productSku ??
    detail.product_sku ??
    product?.sku ??
    product?.code ??
    product?.codigo ??
    undefined;

  const seriesList = Array.isArray(detail.series)
    ? detail.series
    : Array.isArray(detail.soldSeries)
    ? detail.soldSeries.map((item: any) =>
        typeof item === "string"
          ? item
          : item?.number ?? item?.serie ?? item?.code ?? null,
      )
    : [];

  const normalizedPrice = parseNumberValue(detail.price) ?? 0;
  const normalizedSubtotal = parseNumberValue(detail.subtotal);
  const normalizedTotal = parseNumberValue(detail.total);
  const normalizedQuantity = parseNumberValue(detail.quantity);

  return {
    id: detail.id,
    quantity: normalizedQuantity ?? undefined,
    price: normalizedPrice,
    subtotal: normalizedSubtotal,
    total: normalizedTotal,
    product: product
      ? {
          name: product.name ?? product.productName ?? product.nombre,
          sku: product.sku ?? product.code ?? product.codigo,
        }
      : null,
    productName: resolvedName,
    product_name: resolvedName,
    productSku: resolvedSku,
    product_sku: resolvedSku,
    series: seriesList.filter((value:any): value is string | { number?: string } => Boolean(value)),
  };
};

const normalizeApiSale = (sale: any): Sale => {
  const details = Array.isArray(sale.salesDetails)
    ? sale.salesDetails.map(normalizeSaleDetail)
    : Array.isArray(sale.details)
    ? sale.details.map(normalizeSaleDetail)
    : [];

  const payments = Array.isArray(sale.payments)
    ? sale.payments.map((payment: any) => {
        const amount = parseNumberValue(payment.amount);
        const currency =
          typeof payment.currency === "string" && payment.currency.trim().length > 0
            ? payment.currency
            : sale.tipoMoneda ?? sale.tipo_moneda ?? undefined;
        const rawMethod =
          typeof payment.method === "string" && payment.method.trim().length > 0
            ? payment.method.trim()
            : undefined;
        const resolvedMethodName =
          payment.paymentMethod?.name ?? rawMethod ?? undefined;

        return {
          id: payment.id,
          amount: amount ?? undefined,
          currency,
          paymentMethod: resolvedMethodName
            ? { name: resolvedMethodName }
            : payment.paymentMethod ?? null,
        };
      })
    : [];

  const total = parseNumberValue(sale.total);

  return {
    id: sale.id,
    user: { username: sale.user?.username ?? sale.user?.name ?? "—" },
    store: { name: sale.store?.name ?? sale.storeName ?? "—" },
    client: { name: sale.client?.name ?? sale.clientName ?? "—" },
    total: total ?? 0,
    description: sale.description ?? sale.descripcion ?? undefined,
    createdAt: sale.createdAt ?? sale.created_at ?? new Date().toISOString(),
    tipoComprobante: sale.tipoComprobante ?? sale.tipo_comprobante ?? undefined,
    tipoMoneda: sale.tipoMoneda ?? sale.tipo_moneda ?? undefined,
    payments,
    details,
  };
};

export default function Page() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isExportingSummary, setIsExportingSummary] = useState(false);
  const [isExportingDetailed, setIsExportingDetailed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSales();
        const mapped: Sale[] = data
          .map(normalizeApiSale)
          .sort(
            (a: Sale, b: Sale) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        setSales(mapped);
      } catch (error) {
        console.error("Error al obtener las ventas:", error);
      }
    };
    fetchData();
  }, []);

  const handleDeleted = useCallback((id: number) => {
    setSales((prev) => prev.filter((sale) => sale.id !== id));
  }, []);

  const handleViewDetail = useCallback(
    async (sale: Sale) => {
      setSelectedSale(sale);
      setIsDetailOpen(true);
      setIsDetailLoading(true);

      try {
        const detailedSale = await getSaleById(sale.id);
        const normalizedSale = normalizeApiSale(detailedSale);
        setSelectedSale(normalizedSale);
        setSales((prev) =>
          prev.map((item) => (item.id === normalizedSale.id ? normalizedSale : item)),
        );
      } catch (error) {
        console.error("Error al obtener el detalle de la venta:", error);
        toast.error("No se pudo obtener el detalle actualizado de la venta.");
      } finally {
        setIsDetailLoading(false);
      }
    },
    [],
  );

  const handleDetailVisibility = useCallback((open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      setSelectedSale(null);
      setIsDetailLoading(false);
    }
  }, []);

  const columns = useMemo(
    () => createSalesColumns(handleDeleted, handleViewDetail),
    [handleDeleted, handleViewDetail],
  );

  const totalSalesAmount = useMemo(
    () =>
      sales.reduce((acc, sale) => acc + (Number.isFinite(Number(sale.total)) ? Number(sale.total) : 0), 0),
    [sales],
  );

  const escapeHtml = useCallback((value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }, []);

  const formatDateTime = useCallback((value: string | Date | undefined | null) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date);
  }, []);

  const formatCurrency = useCallback((amount: number | undefined | null, currency?: string | null) => {
    const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    const fallbackCurrency = currency && currency.length === 3 ? currency : "PEN";
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: fallbackCurrency,
      minimumFractionDigits: 2,
    }).format(safeAmount);
  }, []);

  const buildSummaryWorkbook = useCallback(
    (data: Sale[]) => {
      if (!data.length) {
        throw new Error("No hay ventas disponibles para exportar");
      }

      const groupedByStore = data.reduce<Record<string, Sale[]>>((acc, sale) => {
        const storeName = sale.store?.name ?? "Sin tienda";
        if (!acc[storeName]) acc[storeName] = [];
        acc[storeName].push(sale);
        return acc;
      }, {});

      const orderedStores = Object.keys(groupedByStore).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" }),
      );

      const generatedAt = formatDateTime(new Date());

      const rows = orderedStores
        .map((storeName) => {
          const storeRows = groupedByStore[storeName]
            .slice()
            .sort((a, b) => a.client?.name.localeCompare(b.client?.name ?? "", "es", { sensitivity: "base" }))
            .map((sale, index) => {
              const payments = (sale.payments ?? [])
                .map((payment) => `${formatCurrency(payment.amount, payment.currency)} - ${escapeHtml(payment.paymentMethod?.name ?? "Método no especificado")}`)
                .join("<br/>");

              return `
                <tr>
                  <td class="numeric">${escapeHtml(index + 1)}</td>
                  <td>${formatDateTime(sale.createdAt)}</td>
                  <td>${escapeHtml(sale.client?.name ?? "—")}</td>
                  <td>${escapeHtml(sale.user?.username ?? "—")}</td>
                  <td>${escapeHtml(sale.tipoComprobante ?? "—")}</td>
                  <td>${escapeHtml(sale.tipoMoneda ?? "PEN")}</td>
                  <td>${formatCurrency(sale.total, sale.tipoMoneda)}</td>
                  <td>${payments || "—"}</td>
                  <td>${escapeHtml(sale.description ?? "")}</td>
                </tr>
              `;
            })
            .join("");

          const storeTotal = groupedByStore[storeName].reduce(
            (acc, sale) => acc + (Number.isFinite(Number(sale.total)) ? Number(sale.total) : 0),
            0,
          );

          return `
            <tr class="section-row">
              <td colspan="9" class="section-title">${escapeHtml(storeName)}</td>
            </tr>
            ${storeRows}
            <tr class="section-total">
              <td colspan="6" class="section-total-label">Total ${escapeHtml(storeName)}</td>
              <td colspan="3" class="section-total-value">${formatCurrency(storeTotal)}</td>
            </tr>
          `;
        })
        .join("");

      const overallTotal = data.reduce(
        (acc, sale) => acc + (Number.isFinite(Number(sale.total)) ? Number(sale.total) : 0),
        0,
      );

      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                background-color: #f8fafc;
                color: #0f172a;
                margin: 0;
                padding: 24px;
              }
              .title {
                font-size: 26px;
                font-weight: 700;
                margin-bottom: 4px;
                color: #0f172a;
              }
              .subtitle {
                font-size: 14px;
                color: #475569;
                margin-bottom: 24px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
                border-radius: 12px;
                overflow: hidden;
              }
              thead tr {
                background: linear-gradient(135deg, #2563eb, #1e40af);
                color: #fff;
              }
              th {
                padding: 14px 12px;
                text-align: left;
                font-size: 12px;
                letter-spacing: 0.05em;
                text-transform: uppercase;
              }
              td {
                padding: 12px 12px;
                border-bottom: 1px solid #e2e8f0;
                background-color: #ffffff;
                font-size: 13px;
              }
              tr:nth-child(even) td {
                background-color: #f1f5f9;
              }
              .section-row td {
                background-color: #e0f2fe;
                font-weight: 600;
                font-size: 14px;
              }
              .section-title {
                padding-top: 18px;
                padding-bottom: 12px;
              }
              .section-total td,
              .section-total {
                background-color: #f8fafc !important;
                font-weight: 600;
              }
              .section-total-label {
                text-align: right;
                color: #1e293b;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                padding-right: 8px;
              }
              .section-total-value {
                text-align: left;
                color: #0f172a;
              }
              .numeric {
                text-align: right;
                font-variant-numeric: tabular-nums;
              }
              .grand-total {
                margin-top: 24px;
                font-size: 16px;
                font-weight: 700;
                text-align: right;
                color: #1e293b;
              }
            </style>
          </head>
          <body>
            <div class="title">Reporte consolidado de ventas</div>
            <div class="subtitle">Generado: ${escapeHtml(generatedAt)}</div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha y hora</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Comprobante</th>
                  <th>Moneda</th>
                  <th>Total</th>
                  <th>Pagos registrados</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
            <div class="grand-total">Total general: ${formatCurrency(overallTotal)}</div>
          </body>
        </html>
      `;
    },
    [escapeHtml, formatCurrency, formatDateTime],
  );

  const buildDetailedWorkbook = useCallback(
    (data: Sale[]) => {
      if (!data.length) {
        throw new Error("No hay ventas disponibles para exportar");
      }

      const generatedAt = formatDateTime(new Date());

      const saleSections = data
        .slice()
        .sort((a, b) => new Date(a.createdAt ?? "").getTime() - new Date(b.createdAt ?? "").getTime())
        .map((sale, saleIndex) => {
          const detailsRows = (sale.details ?? [])
            .slice()
            .sort((a, b) =>
              (a.productName ?? "").localeCompare(b.productName ?? "", "es", { sensitivity: "base" }),
            )
            .map((detail, index) => {
              const resolvedSubtotal =
                Number.isFinite(Number(detail.subtotal))
                  ? Number(detail.subtotal)
                  : Number.isFinite(Number(detail.total))
                  ? Number(detail.total)
                  : Number(detail.quantity ?? 0) * Number(detail.price ?? 0);

              const resolvedTotal =
                Number.isFinite(Number(detail.total))
                  ? Number(detail.total)
                  : resolvedSubtotal;

              const series = (detail.series ?? [])
                .map((seriesValue) =>
                  typeof seriesValue === "string"
                    ? seriesValue
                    : seriesValue?.number ?? "",
                )
                .filter(Boolean)
                .join(", ");

              return `
                <tr>
                  <td class="numeric">${escapeHtml(index + 1)}</td>
                  <td>${escapeHtml(detail.productName ?? detail.product?.name ?? "—")}</td>
                  <td>${escapeHtml(detail.productSku ?? detail.product?.sku ?? "—")}</td>
                  <td class="numeric">${escapeHtml(detail.quantity ?? 0)}</td>
                  <td class="numeric">${formatCurrency(detail.price, sale.tipoMoneda)}</td>
                  <td class="numeric">${formatCurrency(resolvedSubtotal, sale.tipoMoneda)}</td>
                  <td class="numeric">${formatCurrency(resolvedTotal, sale.tipoMoneda)}</td>
                  <td>${escapeHtml(series || "—")}</td>
                </tr>
              `;
            })
            .join("");

          const saleTotal = (sale.details ?? []).reduce((acc, detail) => {
            const resolvedTotal =
              Number.isFinite(Number(detail.total))
                ? Number(detail.total)
                : Number.isFinite(Number(detail.subtotal))
                ? Number(detail.subtotal)
                : Number(detail.quantity ?? 0) * Number(detail.price ?? 0);
            return acc + resolvedTotal;
          }, 0);

          const paymentsRows = (sale.payments ?? [])
            .map((payment, index) => `
              <tr>
                <td class="numeric">${escapeHtml(index + 1)}</td>
                <td>${escapeHtml(payment.paymentMethod?.name ?? "Método no especificado")}</td>
                <td>${escapeHtml(payment.currency ?? sale.tipoMoneda ?? "PEN")}</td>
                <td class="numeric">${formatCurrency(payment.amount, payment.currency ?? sale.tipoMoneda)}</td>
              </tr>
            `)
            .join("");

          const paymentsTable = paymentsRows
            ? `
              <table class="payments-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Método de pago</th>
                    <th>Moneda</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>${paymentsRows}</tbody>
              </table>
            `
            : "<p class=\"no-payments\">No se registraron pagos asociados.</p>";

          return `
            <section class="sale-block">
              <div class="sale-header">
                <div>
                  <h2>Venta #${escapeHtml(sale.id ?? saleIndex + 1)}</h2>
                  <p>${escapeHtml(sale.store?.name ?? "Sin tienda definida")}</p>
                </div>
                <div class="sale-meta">
                  <span><strong>Fecha:</strong> ${formatDateTime(sale.createdAt)}</span>
                  <span><strong>Cliente:</strong> ${escapeHtml(sale.client?.name ?? "—")}</span>
                  <span><strong>Vendedor:</strong> ${escapeHtml(sale.user?.username ?? "—")}</span>
                  <span><strong>Comprobante:</strong> ${escapeHtml(sale.tipoComprobante ?? "—")}</span>
                  <span><strong>Moneda:</strong> ${escapeHtml(sale.tipoMoneda ?? "PEN")}</span>
                </div>
              </div>
              <div class="sale-description">${escapeHtml(sale.description ?? "")}</div>
              <table class="details-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                    <th>Total</th>
                    <th>Series</th>
                  </tr>
                </thead>
                <tbody>
                  ${detailsRows || '<tr><td colspan="8" class="no-data">Sin detalles registrados.</td></tr>'}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="6" class="tfoot-label">Total de la venta</td>
                    <td colspan="2" class="tfoot-value">${formatCurrency(saleTotal, sale.tipoMoneda)}</td>
                  </tr>
                </tfoot>
              </table>
              <div class="payments-section">
                <h3>Pagos registrados</h3>
                ${paymentsTable}
              </div>
            </section>
          `;
        })
        .join("");

      const overallTotal = data.reduce(
        (acc, sale) => acc + (Number.isFinite(Number(sale.total)) ? Number(sale.total) : 0),
        0,
      );

      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                background-color: #f1f5f9;
                color: #0f172a;
                margin: 0;
                padding: 24px;
              }
              .title {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 6px;
              }
              .subtitle {
                color: #475569;
                margin-bottom: 24px;
                font-size: 14px;
              }
              .sale-block {
                background-color: #ffffff;
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: 0 25px 50px -12px rgba(30, 64, 175, 0.15);
              }
              .sale-header {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
                gap: 12px;
              }
              .sale-header h2 {
                margin: 0;
                font-size: 22px;
                color: #1d4ed8;
              }
              .sale-header p {
                margin: 4px 0 0;
                color: #1f2937;
                font-weight: 500;
              }
              .sale-meta {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 6px 12px;
                font-size: 13px;
                color: #475569;
                text-align: right;
              }
              .sale-meta span strong {
                color: #0f172a;
              }
              .sale-description {
                font-size: 13px;
                color: #1f2937;
                margin-bottom: 16px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
              }
              th {
                background: linear-gradient(135deg, #1d4ed8, #1e293b);
                color: #fff;
                padding: 12px 10px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                font-size: 11px;
                text-align: left;
              }
              td {
                padding: 10px 12px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 13px;
              }
              tr:nth-child(even) td {
                background-color: #f8fafc;
              }
              .numeric {
                text-align: right;
                font-variant-numeric: tabular-nums;
              }
              .tfoot-label {
                text-align: right;
                font-weight: 600;
                letter-spacing: 0.05em;
                color: #1f2937;
              }
              .tfoot-value {
                text-align: right;
                font-size: 14px;
                font-weight: 700;
                color: #1d4ed8;
              }
              .payments-section {
                margin-top: 18px;
              }
              .payments-section h3 {
                margin: 0 0 12px;
                color: #0f172a;
                font-size: 16px;
              }
              .payments-table th {
                background: #1e293b;
              }
              .no-payments,
              .no-data {
                text-align: center;
                padding: 18px;
                color: #94a3b8;
                font-style: italic;
              }
              .grand-total {
                font-size: 18px;
                font-weight: 700;
                text-align: right;
                margin-top: 12px;
                color: #0f172a;
              }
            </style>
          </head>
          <body>
            <div class="title">Reporte detallado de ventas</div>
            <div class="subtitle">Generado: ${escapeHtml(generatedAt)}</div>
            ${saleSections}
            <div class="grand-total">Total general de ventas: ${formatCurrency(overallTotal)}</div>
          </body>
        </html>
      `;
    },
    [escapeHtml, formatCurrency, formatDateTime],
  );

  const downloadWorkbook = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportSummary = useCallback(() => {
    if (!sales.length) {
      toast.warning("No hay ventas para exportar");
      return;
    }

    setIsExportingSummary(true);
    try {
      const workbookContent = buildSummaryWorkbook(sales);
      const dateStamp = new Date().toISOString().split("T")[0];
      downloadWorkbook(workbookContent, `reporte_ventas_resumen_${dateStamp}.xls`);
      toast.success("Reporte de ventas (resumen) generado correctamente.");
    } catch (error) {
      console.error("Error al exportar ventas resumidas", error);
      toast.error("No se pudo generar el reporte resumido de ventas.");
    } finally {
      setIsExportingSummary(false);
    }
  }, [buildSummaryWorkbook, downloadWorkbook, sales]);

  const handleExportDetailed = useCallback(() => {
    if (!sales.length) {
      toast.warning("No hay ventas para exportar");
      return;
    }

    setIsExportingDetailed(true);
    try {
      const workbookContent = buildDetailedWorkbook(sales);
      const dateStamp = new Date().toISOString().split("T")[0];
      downloadWorkbook(workbookContent, `reporte_ventas_detallado_${dateStamp}.xls`);
      toast.success("Reporte detallado de ventas generado correctamente.");
    } catch (error) {
      console.error("Error al exportar ventas detalladas", error);
      toast.error("No se pudo generar el reporte detallado de ventas.");
    } finally {
      setIsExportingDetailed(false);
    }
  }, [buildDetailedWorkbook, downloadWorkbook, sales]);

  return (
    <>
      <section className="py-2 sm:py-6">
        <div className="container mx-auto px-1 sm:px-6 lg:px-8">
          <h1 className="px-5 text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
            Historial de Ventas
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between px-5 mb-4">
            <div className="text-sm text-muted-foreground">
              Total acumulado: {formatCurrency(totalSalesAmount)}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleExportSummary}
                disabled={isExportingSummary}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isExportingSummary ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> Exportar ventas (resumen)
                  </span>
                )}
              </Button>
              <Button
                onClick={handleExportDetailed}
                disabled={isExportingDetailed}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isExportingDetailed ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> Exportar ventas (detalle)
                  </span>
                )}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={sales} onRowClick={handleViewDetail} />
          </div>
        </div>
      </section>

      <SaleDetailDialog
          sale={selectedSale}
          open={isDetailOpen}
          onOpenChange={handleDetailVisibility}
          loading={isDetailLoading}
      />
    </>
  );
}