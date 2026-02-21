"use client";

import { useTenantSelection } from "@/context/tenant-selection-context";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSalesColumns, Sale } from "./columns";
import { DataTable } from "./data-table";
import { getSaleById, getSales } from "./sales.api";
import { SaleDetailDialog } from "./components/sale-detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import { BarChart3, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TablePageSkeleton } from "@/components/table-page-skeleton";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { SALES_LIST_GUIDE_STEPS } from "./sales-list-guide-steps";

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

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : undefined;
  }
  return undefined;
};

const normalizeSunatTimestamp = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const candidate =
    value instanceof Date ? value : typeof value === "string" ? new Date(value) : new Date(String(value));
  if (Number.isNaN(candidate.getTime())) {
    return undefined;
  }
  return candidate.toISOString();
};

const normalizeSunatStatus = (value: any) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const statusRaw = typeof value.status === "string" ? value.status.trim() : "";
  if (!statusRaw) {
    return null;
  }

  return {
    id: typeof value.id === "number" ? value.id : Number(value.id) || undefined,
    status: statusRaw.toUpperCase(),
    ticket: value.ticket ?? null,
    environment: typeof value.environment === "string" ? value.environment : null,
    errorMessage: value.errorMessage ?? null,
    updatedAt: normalizeSunatTimestamp(value.updatedAt ?? value.updated_at),
  };
};

const normalizeSunatTransmissions = (value: any): Sale["sunatTransmissions"] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      id: typeof item.id === "number" ? item.id : Number(item.id) || undefined,
      status: String(item.status ?? "PENDING").toUpperCase(),
      ticket: item.ticket ?? null,
      environment: typeof item.environment === "string" ? item.environment : null,
      errorMessage: item.errorMessage ?? null,
      updatedAt: normalizeSunatTimestamp(item.updatedAt ?? item.updated_at),
      createdAt: normalizeSunatTimestamp(item.createdAt ?? item.created_at),
    }))
    .filter((item) => typeof item.status === "string");
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
        const normalizedId =
          typeof payment.id === "number" || typeof payment.id === "string"
            ? payment.id
            : undefined;
        const normalizedTransactionId =
          typeof payment.transactionId === "string" && payment.transactionId.trim().length > 0
            ? payment.transactionId.trim()
            : undefined;
        const normalizedReferenceNote =
          typeof payment.referenceNote === "string" && payment.referenceNote.trim().length > 0
            ? payment.referenceNote.trim()
            : undefined;
        const normalizedCashTransactionId =
          typeof payment.cashTransactionId === "number" ||
          typeof payment.cashTransactionId === "string"
            ? payment.cashTransactionId
            : typeof payment.cashTransaction?.id === "number" ||
                typeof payment.cashTransaction?.id === "string"
            ? payment.cashTransaction.id
            : undefined;

        return {
          id: normalizedId,
          amount: amount ?? undefined,
          currency,
          transactionId: normalizedTransactionId,
          referenceNote: normalizedReferenceNote,
          cashTransactionId: normalizedCashTransactionId,
          paymentMethod: resolvedMethodName
            ? { name: resolvedMethodName }
            : payment.paymentMethod ?? null,
        };
      })
    : [];

  const total = parseNumberValue(sale.total);
  const sunatStatus = normalizeSunatStatus(
    sale.sunatStatus ?? sale.sunat_status ?? null,
  );
  const sunatTransmissions = normalizeSunatTransmissions(
    sale.sunatTransmissions ?? sale.sunat_transmissions ?? [],
  );

  const clientDocumentCandidate =
    sale.client?.documentNumber ??
    sale.client?.document_number ??
    sale.client?.document ??
    sale.client?.numeroDocumento ??
    sale.client?.numero_documento ??
    sale.client?.identificationNumber ??
    sale.client?.identification_number ??
    sale.client?.identityNumber ??
    sale.client?.identity_number ??
    sale.clientDocumentNumber ??
    sale.client_document_number ??
    sale.clientDocument ??
    sale.client_document ??
    sale.clientIdentification ??
    sale.client_identification ??
    sale.clientNumber ??
    sale.client_number ??
    sale.clientDocumentId ??
    sale.client_document_id ??
    sale.clientTaxId ??
    sale.client_tax_id ??
    sale.client?.taxId ??
    sale.client?.tax_id ??
    sale.clientDocNumber ??
    sale.client_doc_number ??
    sale.client?.docNumber ??
    sale.client?.doc_number ??
    sale.client?.nroDocumento ??
    sale.client?.nro_documento ??
    sale.client?.numDocumento ??
    sale.client?.num_documento ??
    sale.clientNumDocumento ??
    sale.client_num_documento ??
    sale.client?.numeroIdentificacion ??
    sale.client?.numero_identificacion ??
    sale.client?.numeroId ??
    sale.client?.numero_id ??
    sale.clientNumeroId ??
    sale.client_numero_id ??
    sale.clientDocumentValue ??
    sale.client_document_value ??
    undefined;

  const clientDniCandidate =
    sale.client?.dni ??
    sale.client?.dniNumber ??
    sale.client?.documentDni ??
    sale.client?.document_dni ??
    sale.client?.numeroDni ??
    sale.client?.numero_dni ??
    sale.client?.numDni ??
    sale.client?.num_dni ??
    sale.clientDni ??
    sale.client_dni ??
    sale.clientNumDni ??
    sale.client_num_dni ??
    sale.clientDniNumber ??
    sale.client_dni_number ??
    undefined;

  const clientRucCandidate =
    sale.client?.ruc ??
    sale.client?.documentRuc ??
    sale.client?.document_ruc ??
    sale.client?.numeroRuc ??
    sale.client?.numero_ruc ??
    sale.clientRuc ??
    sale.client_ruc ??
    sale.clientNumRuc ??
    sale.client_num_ruc ??
    sale.clientRucNumber ??
    sale.client_ruc_number ??
    undefined;

  const normalizedClientDocument = normalizeOptionalString(clientDocumentCandidate);
  const normalizedClientDni = normalizeOptionalString(clientDniCandidate);
  const normalizedClientRuc = normalizeOptionalString(clientRucCandidate);

  return {
    id: sale.id,
    user: { username: sale.user?.username ?? sale.user?.name ?? "—" },
    store: { name: sale.store?.name ?? sale.storeName ?? "—" },
    client: {
      name: sale.client?.name ?? sale.clientName ?? "—",
      documentNumber: normalizedClientDocument,
      dni: normalizedClientDni,
      ruc: normalizedClientRuc,
    },
    total: total ?? 0,
    description: sale.description ?? sale.descripcion ?? undefined,
    createdAt: sale.createdAt ?? sale.created_at ?? new Date().toISOString(),
    tipoComprobante: sale.tipoComprobante ?? sale.tipo_comprobante ?? undefined,
    tipoMoneda: sale.tipoMoneda ?? sale.tipo_moneda ?? undefined,
    payments,
    details,
    sunatStatus,
    sunatTransmissions,
  };
};

export default function Page() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isExportingSummary, setIsExportingSummary] = useState(false);
  const [isExportingDetailed, setIsExportingDetailed] = useState(false);
  const [storeQuery, setStoreQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { selection, version } = useTenantSelection();
  const selectionKey = useMemo(
    () => `${selection.orgId ?? "none"}-${selection.companyId ?? "none"}-${version}`,
    [selection.orgId, selection.companyId, version],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setSalesLoading(true);
      try {
        const data = await getSales();
        if (cancelled) return;
        const mapped: Sale[] = data
          .map(normalizeApiSale)
          .sort(
            (a: Sale, b: Sale) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        setSales(mapped);
      } catch (error) {
        console.error("Error al obtener las ventas:", error);
      } finally {
        if (!cancelled) setSalesLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [selectionKey]);

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

  const paymentMethodOptions = useMemo(() => {
    const methods = new Set<string>();
    sales.forEach((sale) => {
      (sale.payments ?? []).forEach((payment) => {
        const methodName = payment.paymentMethod?.name;
        if (typeof methodName === "string") {
          const normalized = methodName.trim();
          if (normalized.length > 0) {
            methods.add(normalized);
          }
        }
      });
    });
    return Array.from(methods).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [sales]);

  const filteredSales = useMemo((): Sale[] => {
    if (!sales.length) return [];

    const normalizedStore = storeQuery.trim().toLowerCase();
    const normalizedClient = clientQuery.trim().toLowerCase();
    const parsedMin = Number.parseFloat(minTotal.replace(/,/g, "."));
    const parsedMax = Number.parseFloat(maxTotal.replace(/,/g, "."));
    const hasMin = !Number.isNaN(parsedMin);
    const hasMax = !Number.isNaN(parsedMax);
    const hasPaymentFilter = selectedPaymentMethod !== "ALL";
    const normalizedPayment = selectedPaymentMethod.toLowerCase();

    const fromDate = dateRange?.from ? new Date(dateRange.from) : undefined;
    const toDate = dateRange?.to ? new Date(dateRange.to) : undefined;

    if (fromDate) {
      fromDate.setHours(0, 0, 0, 0);
    }
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    return sales.filter((sale) => {
      if (normalizedStore) {
        const storeName = (sale.store?.name ?? "").toLowerCase();
        if (!storeName.includes(normalizedStore)) {
          return false;
        }
      }

      if (normalizedClient) {
        const candidateValues = [
          sale.client?.name,
          sale.client?.documentNumber,
          sale.client?.dni,
          sale.client?.ruc,
        ]
          .filter(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0,
          )
          .map((value) => value.toLowerCase());

        if (!candidateValues.some((value) => value.includes(normalizedClient))) {
          return false;
        }
      }

      const totalValue = Number(sale.total);
      if (hasMin && (!Number.isFinite(totalValue) || totalValue < parsedMin)) {
        return false;
      }
      if (hasMax && (!Number.isFinite(totalValue) || totalValue > parsedMax)) {
        return false;
      }

      if (hasPaymentFilter) {
        const hasMethod = (sale.payments ?? []).some((payment) => {
          const methodName = payment.paymentMethod?.name;
          return (
            typeof methodName === "string" &&
            methodName.trim().toLowerCase() === normalizedPayment
          );
        });
        if (!hasMethod) {
          return false;
        }
      }

      if (fromDate || toDate) {
        const saleDate = new Date(sale.createdAt);
        if (Number.isNaN(saleDate.getTime())) {
          return false;
        }
        if (fromDate && saleDate < fromDate) {
          return false;
        }
        if (toDate && saleDate > toDate) {
          return false;
        }
      }

      return true;
    });
  }, [sales, storeQuery, clientQuery, minTotal, maxTotal, selectedPaymentMethod, dateRange]);

  const totalSalesAmount = useMemo(
    () =>
      sales.reduce(
        (acc, sale) =>
          acc + (Number.isFinite(Number(sale.total)) ? Number(sale.total) : 0),
        0,
      ),
    [sales],
  );

  const filteredTotalSalesAmount = useMemo(
    () =>
      filteredSales.reduce(
        (acc, sale) =>
          acc + (Number.isFinite(Number(sale.total)) ? Number(sale.total) : 0),
        0,
      ),
    [filteredSales],
  );

  const isFiltered = useMemo(
    () =>
      Boolean(
        storeQuery.trim() ||
          clientQuery.trim() ||
          minTotal.trim() ||
          maxTotal.trim() ||
          selectedPaymentMethod !== "ALL" ||
          dateRange?.from ||
          dateRange?.to,
      ),
    [storeQuery, clientQuery, minTotal, maxTotal, selectedPaymentMethod, dateRange],
  );

  const handleResetFilters = useCallback(() => {
    setStoreQuery("");
    setClientQuery("");
    setMinTotal("");
    setMaxTotal("");
    setSelectedPaymentMethod("ALL");
    setDateRange(undefined);
  }, []);

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
    const dataset = isFiltered ? filteredSales : sales;
    if (!dataset.length) {
      toast.warning("No hay ventas para exportar");
      return;
    }

    setIsExportingSummary(true);
    try {
      const workbookContent = buildSummaryWorkbook(dataset);
      const dateStamp = new Date().toISOString().split("T")[0];
      downloadWorkbook(workbookContent, `reporte_ventas_resumen_${dateStamp}.xls`);
      toast.success("Reporte de ventas (resumen) generado correctamente.");
    } catch (error) {
      console.error("Error al exportar ventas resumidas", error);
      toast.error("No se pudo generar el reporte resumido de ventas.");
    } finally {
      setIsExportingSummary(false);
    }
  }, [buildSummaryWorkbook, downloadWorkbook, filteredSales, isFiltered, sales]);

  const handleExportDetailed = useCallback(() => {
    const dataset = isFiltered ? filteredSales : sales;
    if (!dataset.length) {
      toast.warning("No hay ventas para exportar");
      return;
    }

    setIsExportingDetailed(true);
    try {
      const workbookContent = buildDetailedWorkbook(dataset);
      const dateStamp = new Date().toISOString().split("T")[0];
      downloadWorkbook(workbookContent, `reporte_ventas_detallado_${dateStamp}.xls`);
      toast.success("Reporte detallado de ventas generado correctamente.");
    } catch (error) {
      console.error("Error al exportar ventas detalladas", error);
      toast.error("No se pudo generar el reporte detallado de ventas.");
    } finally {
      setIsExportingDetailed(false);
    }
  }, [buildDetailedWorkbook, downloadWorkbook, filteredSales, isFiltered, sales]);

  if (salesLoading && sales.length === 0) {
    return (
      <section className="py-2 sm:py-6">
        <div className="container mx-auto px-1 sm:px-6 lg:px-8">
          <TablePageSkeleton filters={4} columns={6} rows={8} />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-2 sm:py-6">
        <div className="container mx-auto px-1 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 px-5 mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              Historial de Ventas
            </h1>
            <PageGuideButton steps={SALES_LIST_GUIDE_STEPS} tooltipLabel="Guía de ventas" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between px-5 mb-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Total acumulado:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(filteredTotalSalesAmount)}
                </span>
              </p>
              {isFiltered && (
                <p className="text-xs text-muted-foreground">
                  Total general sin filtros: {formatCurrency(totalSalesAmount)}
                </p>
              )}
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
              <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
                <Link href="/dashboard/sales/product-report" prefetch={false}>
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Reporte de productos
                  </span>
                </Link>
              </Button>
            </div>
          </div>
          <div className="px-5">
            <div className="space-y-4 rounded-2xl bg-card p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tienda
                  </p>
                  <Input
                    type="search"
                    value={storeQuery}
                    onChange={(event) => setStoreQuery(event.target.value)}
                    placeholder="Buscar por tienda"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cliente
                  </p>
                  <Input
                    type="search"
                    value={clientQuery}
                    onChange={(event) => setClientQuery(event.target.value)}
                    placeholder="Nombre o documento"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Monto total (S/)
                  </p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    <Input
                      value={minTotal}
                      onChange={(event) => setMinTotal(event.target.value)}
                      placeholder="Mínimo"
                      className="h-10"
                      inputMode="decimal"
                    />
                    <Input
                      value={maxTotal}
                      onChange={(event) => setMaxTotal(event.target.value)}
                      placeholder="Máximo"
                      className="h-10"
                      inputMode="decimal"
                    />
                  </div>
                </div>
                <div className="space-y-1 flex flex-col justify-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Método de pago
                  </p>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Todos los métodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos los métodos</SelectItem>
                      {paymentMethodOptions.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-2 2xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Rango de fechas
                  </p>
                  <CalendarDatePicker
                    className="h-10 w-full justify-between"
                    variant="outline"
                    date={dateRange ?? { from: undefined, to: undefined }}
                    onDateSelect={({ from, to }) => setDateRange({ from, to })}
                    closeOnSelect
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {" "}
                  <span className="font-semibold text-foreground">{filteredSales.length}</span>{" "}
                  de {sales.length} venta{sales.length === 1 ? "" : "s"}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    Total filtrado:{" "}
                    <span className="text-primary">
                      {formatCurrency(filteredTotalSalesAmount)}
                    </span>
                  </span>
                  {isFiltered && (
                    <Button
                      variant="ghost"
                      onClick={handleResetFilters}
                      className="h-9 px-3"
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={filteredSales}
              onRowClick={handleViewDetail}
            />
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
