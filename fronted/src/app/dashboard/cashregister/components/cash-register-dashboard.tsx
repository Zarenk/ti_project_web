"use client"

import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Transaction } from "../types/cash-register"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CashTransferForm from "./cash-transfer-form"
import CashClosureForm from "./cash-closure-form"
import TransactionHistory from "./transaction-history"
import { createCashRegister, getActiveCashRegister, getCashRegisterBalance, getClosureByDate, getClosuresByStore, getTodayTransactions, getTransactionsByDate } from "../cashregister.api"
import { getStores } from "../../stores/stores.api"
import { TENANT_SELECTION_EVENT } from "@/utils/tenant-preferences"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Plus, FileSpreadsheet, FileText } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { format, isSameDay } from "date-fns";
import {
  adaptTransaction,
  applyNextOpeningBalanceToClosures,
  applyNextOpeningBalanceToTransactions,
  computeClosureNextOpeningMap,
  decorateTransactionsWithStoreNames,
  downloadBlob,
  escapeHtml,
  extractAmountFromMethodEntry,
  formatPaymentMethodsForReport,
  formatSignedCurrency,
  identifyPaymentSummaryMethod,
  isCashPaymentMethod,
  mergeSaleTransactions,
  normalizeWhitespace,
  PAYMENT_SUMMARY_LABELS,
  PAYMENT_SUMMARY_METHODS,
  REPORT_COLUMNS,
  resolveLatestClosureOverride,
  resolveSignedAmount,
  sanitizeClosureNotes,
  sortClosuresByDateDesc,
  TRANSACTION_TYPE_LABELS,
  withLatestClosureOverride,
  ymdLocal,
  type CashReportRow,
  type PaymentSummaryKey,
} from "./cash-register-utils"

export default function CashRegisterDashboard() {

  const [isFetchingTransactions, setIsFetchingTransactions] = useState(false);
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  // Validar sesiÃƒÂ³n
  useEffect(() => {
    async function check() {
      const userData = await getUserDataFromToken();
      if (!userData || !(await isTokenValid())) {
        router.replace("/login");
      } else {
        setUserId(userData.id);
      }
      setCheckingSession(false);
    }
    check();
  }, [router]);

  // -------------------- HOOKS PRINCIPALES --------------------
  const [balance, setBalance] = useState(0)
  const [initialBalance, setInitialBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsForBalance, setTransactionsForBalance] = useState<Transaction[]>([])
  const [storeId, setStoreId] = useState<number | null>(null); // Estado para la tienda seleccionada
  const storeIdRef = useRef<number | null>(null);
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]); // Lista de tiendas
  const [hasCashRegister, setHasCashRegister] = useState(true); // Ã°Å¸â€˜Ë† Estado nuevo
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [activeCashRegisterId, setActiveCashRegisterId] = useState<number | null>(null);
  const [closures, setClosures] = useState<any[]>([]);
  const [dailyClosureInfo, setDailyClosureInfo] = useState<{
    openingBalance: number;
    closingBalance: number;
  } | null>(null);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [initialAmountToOpen, setInitialAmountToOpen] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const isToday = isSameDay(selectedDate, new Date());
  const [closureNextOpeningLookup, setClosureNextOpeningLookup] = useState<Record<string, number>>({});
  const [tenantRefreshKey, setTenantRefreshKey] = useState(0);

  const selectedStoreName = useMemo(() => {
    if (storeId === null) {
      return "Sin tienda"
    }
    const store = stores.find((item) => item.id === storeId)
    return store?.name ?? "Sin tienda"
  }, [storeId, stores])

  const storeNameLookup = useMemo(() => {
    return stores.reduce<Record<number, string>>((accumulator, store) => {
      accumulator[store.id] = store.name
      return accumulator
    }, {})
  }, [stores])

  useEffect(() => {
    storeIdRef.current = storeId;
  }, [storeId]);

  const reportRows = useMemo<CashReportRow[]>(() => {
    return transactions.map((transaction) => {
      const rawDate = transaction.timestamp
        ? new Date(transaction.timestamp as any)
        : transaction.createdAt
        ? new Date(transaction.createdAt as any)
        : null
      const hasValidDate = rawDate instanceof Date && !Number.isNaN(rawDate.getTime())
      const formattedDate = hasValidDate && rawDate ? format(rawDate, "dd/MM/yyyy HH:mm:ss") : "-"
      const currencySymbol = (transaction.currency ?? "S/.").trim()
      const entryType = transaction.internalType ?? transaction.type
      const signedAmount = resolveSignedAmount(Number(transaction.amount ?? 0), entryType)
      const amountDisplay = formatSignedCurrency(signedAmount, currencySymbol)
      const paymentMethodsDisplay = formatPaymentMethodsForReport(transaction.paymentMethods, entryType)

      const normalizedEntryType = (entryType ?? "").toUpperCase()
      const isClosure = normalizedEntryType === "CLOSURE"
      const openingBalanceDisplay = isClosure && transaction.openingBalance !== null && transaction.openingBalance !== undefined
        ? `${currencySymbol} ${Number(transaction.openingBalance ?? 0).toFixed(2)}`
        : "-"
      const cashAvailableBase = transaction.closingBalance ?? transaction.totalIncome ?? transaction.amount ?? 0
      const cashAvailableDisplay = isClosure
        ? `${currencySymbol} ${Number(cashAvailableBase).toFixed(2)}`
        : "-"

      const documentParts = [
        transaction.clientDocumentType ?? "",
        transaction.clientDocument ?? "",
      ]
        .map((value) => (value ?? "").trim())
        .filter((value) => value.length > 0)

      const rawNotes = typeof transaction.description === "string" ? transaction.description : ""
      const notesValue = (() => {
        if (!rawNotes) {
          return "-"
        }

        if (isClosure) {
          const sanitized = sanitizeClosureNotes(rawNotes)
          return sanitized.length > 0 ? sanitized : "-"
        }

        const normalized = normalizeWhitespace(rawNotes)
        return normalized.length > 0 ? normalized : "-"
      })()

      return {
        timestamp: formattedDate,
        type: TRANSACTION_TYPE_LABELS[transaction.type] ?? transaction.type ?? "-",
        amount: amountDisplay,
        openingBalance: openingBalanceDisplay,
        cashAvailable: cashAvailableDisplay,
        paymentMethods: paymentMethodsDisplay,
        employee: transaction.employee?.trim() || "-",
        client: transaction.clientName?.trim() || "Sin cliente",
        document: documentParts.length > 0 ? documentParts.join(" ") : "-",
        notes: notesValue,
        voucher: transaction.voucher ?? "-",
      }
    })
  }, [transactions])

  const paymentMethodSummary = useMemo(() => {
    const totals: Record<PaymentSummaryKey, number> = {
      Efectivo: 0,
      Yape: 0,
      Plin: 0,
      Tarjeta: 0,
      Transferencia: 0,
    };

    let resolvedCurrency = "S/.";

    transactions.forEach((transaction) => {
      if (!transaction) {
        return;
      }

      const entryType = transaction.internalType ?? transaction.type;
      if (entryType !== "INCOME" && entryType !== "EXPENSE") {
        return;
      }

      const transactionCurrency =
        typeof transaction.currency === "string" && transaction.currency.trim().length > 0
          ? transaction.currency.trim()
          : resolvedCurrency;

      if (transactionCurrency) {
        resolvedCurrency = transactionCurrency;
      }

      const totalAmount = Number(transaction.amount ?? 0);
      if (!Number.isFinite(totalAmount) || totalAmount === 0) {
        return;
      }

      const signedTotalAmount = resolveSignedAmount(totalAmount, entryType);

      const methods = Array.isArray(transaction.paymentMethods) ? transaction.paymentMethods : [];
      if (methods.length === 0) {
        return;
      }

      const entries: { key: PaymentSummaryKey; amount: number | null }[] = [];

      methods.forEach((rawValue) => {
        const methodKey = identifyPaymentSummaryMethod(rawValue);
        if (!methodKey) {
          return;
        }
        const amountValue = extractAmountFromMethodEntry(rawValue);
        entries.push({ key: methodKey, amount: amountValue });
      });

      if (entries.length === 0) {
        return;
      }

      let assignedAmount = 0;
      const applySignedAmount = (value: number): number => {
        if (!Number.isFinite(value)) {
          return 0;
        }
        if (value === 0) {
          return 0;
        }
        if (value < 0) {
          return value;
        }
        return signedTotalAmount < 0 ? -value : value;
      };

      entries.forEach((entry) => {
        if (entry.amount === null) {
          return;
        }
        const normalizedAmount = applySignedAmount(entry.amount);
        totals[entry.key] += normalizedAmount;
        assignedAmount += normalizedAmount;
      });

      const fallbackEntries = entries.filter((entry) => entry.amount === null);
      const remaining = Number((signedTotalAmount - assignedAmount).toFixed(2));

      if (remaining !== 0 && fallbackEntries.length === 1) {
        totals[fallbackEntries[0].key] += remaining;
      }
    });

    const rows = PAYMENT_SUMMARY_METHODS.map((method) => ({
      method,
      label: PAYMENT_SUMMARY_LABELS[method],
      amount: Number(totals[method].toFixed(2)),
    }));

    const totalAmount = rows.reduce((acc, row) => acc + row.amount, 0);

    return {
      currencySymbol: resolvedCurrency || "S/.",
      rows,
      total: Number(totalAmount.toFixed(2)),
    };
  }, [transactions]);

  const latestClosureTimestamp = useMemo(() => {
    if (!Array.isArray(closures) || closures.length === 0) {
      return null;
    }

    const selectedDateEnd = new Date(selectedDate);
    selectedDateEnd.setHours(23, 59, 59, 999);

    return closures.reduce<Date | null>((latest, closure) => {
      if (!closure || !closure.createdAt) {
        return latest;
      }

      const createdAt = new Date(closure.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt > selectedDateEnd) {
        return latest;
      }

      if (!latest || createdAt > latest) {
        return createdAt;
      }

      return latest;
    }, null);
  }, [closures, selectedDate]);

  // Mantiene una lista completa de transacciones (ingresos/retiros) que se
  // cargaron desde el último cierre para calcular el efectivo esperado aún si
  // la operación sucedió antes de la medianoche del día seleccionado.
  const transactionsSinceLastClosure = useMemo(() => {
    const sourceTransactions = transactionsForBalance;

    if (!latestClosureTimestamp) {
      return sourceTransactions;
    }

    const closureTime = latestClosureTimestamp.getTime();

    return sourceTransactions.filter((transaction) => {
      const candidate = (() => {
        const { timestamp, createdAt } = transaction as { timestamp?: unknown; createdAt?: unknown };

        if (timestamp instanceof Date) {
          return timestamp;
        }

        if (typeof timestamp === "string" || typeof timestamp === "number") {
          const parsed = new Date(timestamp);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed;
          }
        }

        if (createdAt instanceof Date) {
          return createdAt;
        }

        if (typeof createdAt === "string" || typeof createdAt === "number") {
          const parsed = new Date(createdAt);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed;
          }
        }

        return null;
      })();

      if (!candidate) {
        return true;
      }

      return candidate.getTime() > closureTime;
    });
  }, [transactionsForBalance, latestClosureTimestamp]);

  const cashIncomeTotal = useMemo(() => {
    const baseTransactions = isToday ? transactionsSinceLastClosure : transactions;
    let incomeTotal = 0;
    let expenseTotal = 0;

    baseTransactions.forEach((transaction) => {
      if (!transaction || (transaction.type !== "INCOME" && transaction.type !== "EXPENSE")) {
        return;
      }

      const methods = Array.isArray(transaction.paymentMethods)
        ? transaction.paymentMethods
        : [];
      if (methods.length === 0) {
        return;
      }

      const cashEntries = methods.filter((rawValue) => isCashPaymentMethod(rawValue));
      if (cashEntries.length === 0) {
        return;
      }

      let explicitAmount = 0;
      let hasExplicitAmount = false;
      cashEntries.forEach((rawValue) => {
        const amount = extractAmountFromMethodEntry(rawValue);
        if (amount !== null) {
          explicitAmount += amount;
          hasExplicitAmount = true;
        }
      });

      const resolvedAmount = hasExplicitAmount
        ? explicitAmount
        : cashEntries.length === methods.length
          ? Number(transaction.amount ?? 0)
          : 0;

      if (transaction.type === "INCOME") {
        incomeTotal += Math.abs(resolvedAmount);
      } else if (transaction.type === "EXPENSE") {
        expenseTotal += Math.abs(resolvedAmount);
      }
    });

    const roundedIncome = Number(incomeTotal.toFixed(2));
    const roundedExpense = Number(expenseTotal.toFixed(2));
    const openingBalance = Number(initialBalance ?? 0);
    const expectedCash = openingBalance + roundedIncome - roundedExpense;

    return Number(expectedCash.toFixed(2));
  }, [transactions, transactionsSinceLastClosure, isToday, initialBalance]);

  const openingBalanceForDisplay = useMemo(() => {
    if (isSameDay(selectedDate, new Date())) {
      if (hasCashRegister) {
        return Number(initialBalance ?? 0);
      }

      if (dailyClosureInfo) {
        return Number(dailyClosureInfo.openingBalance ?? 0);
      }

      return null;
    }

    if (dailyClosureInfo) {
      return Number(dailyClosureInfo.openingBalance ?? 0);
    }

    return null;
  }, [selectedDate, hasCashRegister, initialBalance, dailyClosureInfo]);

  const closureFormOpeningBalance = Number(initialBalance ?? 0);

  const isReportEmpty = reportRows.length === 0

  const handleExportExcel = () => {
    if (isReportEmpty) {
      toast.info("No hay movimientos para exportar.")
      return
    }

    const reportDateLabel = format(selectedDate, "dd/MM/yyyy")
    const reportFileDate = format(selectedDate, "yyyy-MM-dd")
    const caption = `Reporte de Caja - ${selectedStoreName} (${reportDateLabel})`
    const sanitizedCaption = escapeHtml(caption)

    const tableHead = REPORT_COLUMNS.map((column) =>
      `<th style="background-color:#f5f5f5;text-align:left;padding:8px;border:1px solid #cccccc;">${escapeHtml(column.header)}</th>`
    ).join("")

    const tableBody = reportRows
      .map((row) => {
        const cells = REPORT_COLUMNS.map((column) => {
          const value = (row[column.key] ?? "-") as string
          return `<td style="padding:6px;border:1px solid #dddddd;vertical-align:top;">${escapeHtml(value)}</td>`
        }).join("")
        return `<tr>${cells}</tr>`
      })
      .join("")

    const tableHtml = `
      <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;min-width:720px;">
        <caption style="margin-bottom:8px;font-weight:bold;">${sanitizedCaption}</caption>
        <thead><tr>${tableHead}</tr></thead>
        <tbody>${tableBody}</tbody>
      </table>
    `.trim()

    const summaryTableRows = paymentMethodSummary.rows
      .map((row) => {
        const amountDisplay = formatSignedCurrency(row.amount, paymentMethodSummary.currencySymbol)
        return `
          <tr>
            <td style="padding:6px;border:1px solid #dddddd;">${escapeHtml(row.label)}</td>
            <td style="padding:6px;border:1px solid #dddddd;text-align:right;">${escapeHtml(amountDisplay)}</td>
          </tr>
        `.trim()
      })
      .join("")

    const summaryTotalDisplay = formatSignedCurrency(
      paymentMethodSummary.total,
      paymentMethodSummary.currencySymbol,
    )
    const summaryTotalRow = `
      <tr>
        <td style="padding:6px;border:1px solid #dddddd;font-weight:bold;">Total</td>
        <td style="padding:6px;border:1px solid #dddddd;text-align:right;font-weight:bold;">${escapeHtml(summaryTotalDisplay)}</td>
      </tr>
    `.trim()

    const summaryTableHtml = `
      <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;min-width:360px;">
        <caption style="margin:16px 0 8px;font-weight:bold;">Resumen por metodo</caption>
        <thead>
          <tr>
            <th style="background-color:#f5f5f5;text-align:left;padding:8px;border:1px solid #cccccc;">Metodo</th>
            <th style="background-color:#f5f5f5;text-align:right;padding:8px;border:1px solid #cccccc;">Total</th>
          </tr>
        </thead>
        <tbody>${summaryTableRows}${summaryTotalRow}</tbody>
      </table>
    `.trim()

    const bodyContent = `${tableHtml}<br/><br/>${summaryTableHtml}`

    const htmlDocument = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${sanitizedCaption}</title>
        </head>
        <body>${bodyContent}</body>
      </html>
    `.trim()

    const blob = new Blob(["\uFEFF", htmlDocument], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    })
    downloadBlob(blob, `reporte-caja-${reportFileDate}.xls`)
    toast.success("Reporte Excel generado correctamente.")
  }

  const handleExportPdf = async () => {
    if (isReportEmpty) {
      toast.info("No hay movimientos para exportar.")
      return
    }

    setIsGeneratingPdf(true)
    try {
      const reportDateLabel = format(selectedDate, "dd/MM/yyyy")
      const reportFileDate = format(selectedDate, "yyyy-MM-dd")
      const cs = paymentMethodSummary.currencySymbol

      /* ── Compute KPIs ── */
      const incomeRows = paymentMethodSummary.rows.filter((r) => r.amount > 0)
      const expenseRows = paymentMethodSummary.rows.filter((r) => r.amount < 0)
      const totalIncome = incomeRows.reduce((s, r) => s + r.amount, 0)
      const totalExpense = Math.abs(expenseRows.reduce((s, r) => s + r.amount, 0))
      const openBal = openingBalanceForDisplay ?? 0
      const incomeCount = reportRows.filter((r) => r.type === "Ingresos").length
      const expenseCount = reportRows.filter((r) => r.type === "Retiros").length
      const closureCount = reportRows.filter((r) => r.type === "Cierre").length

      /* ── Color palette ── */
      const navy = "#1B2A4A"
      const navyLight = "#2D4A7A"
      const teal = "#0891B2"
      const emerald = "#10B981"
      const emeraldBg = "#ECFDF5"
      const red = "#EF4444"
      const redBg = "#FEF2F2"
      const amber = "#F59E0B"
      const amberBg = "#FFFBEB"
      const grayText = "#64748B"
      const grayLight = "#F1F5F9"
      const grayMed = "#E2E8F0"
      const dark = "#1E293B"
      const blueBg = "#EFF6FF"
      const tealBg = "#E0F7FA"

      const s = StyleSheet.create({
        page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", backgroundColor: "#FFFFFF" },
        /* Header banner */
        banner: { backgroundColor: navy, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 6, marginBottom: 2 },
        bannerTitle: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF", letterSpacing: 0.5 },
        bannerSub: { fontSize: 9, color: "#CBD5E1", marginTop: 2 },
        accentLine: { height: 3, backgroundColor: teal, borderRadius: 2, marginBottom: 14 },
        /* KPI cards */
        kpiRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
        kpiCard: { flex: 1, borderRadius: 6, padding: 10, borderWidth: 1 },
        kpiLabel: { fontSize: 7, fontWeight: "bold", letterSpacing: 0.4, marginBottom: 4, textTransform: "uppercase" as any },
        kpiValue: { fontSize: 13, fontWeight: "bold" },
        kpiMeta: { fontSize: 7, marginTop: 2 },
        /* Section title */
        sectionTitle: { fontSize: 11, fontWeight: "bold", color: navy, marginBottom: 8, marginTop: 4 },
        sectionDivider: { height: 1, backgroundColor: grayMed, marginBottom: 10 },
        /* Transaction table */
        tableContainer: { borderWidth: 1, borderColor: grayMed, borderRadius: 6, overflow: "hidden" },
        tHeader: { flexDirection: "row", backgroundColor: navy, paddingVertical: 7, paddingHorizontal: 6 },
        tHeaderText: { color: "#FFFFFF", fontSize: 7.5, fontWeight: "bold", letterSpacing: 0.3, textTransform: "uppercase" as any },
        tRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: grayMed },
        tRowEven: { backgroundColor: grayLight },
        tCell: { fontSize: 8.5, color: dark },
        tCellRight: { textAlign: "right" },
        tCellMuted: { color: grayText },
        /* Type badges */
        badgeIncome: { backgroundColor: emeraldBg, color: emerald, fontSize: 7, fontWeight: "bold", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, textAlign: "center" },
        badgeExpense: { backgroundColor: redBg, color: red, fontSize: 7, fontWeight: "bold", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, textAlign: "center" },
        badgeClosure: { backgroundColor: amberBg, color: amber, fontSize: 7, fontWeight: "bold", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, textAlign: "center" },
        /* Summary cards */
        summaryGrid: { flexDirection: "row", gap: 10, marginTop: 14 },
        summaryCard: { flex: 1, borderRadius: 6, borderWidth: 1, borderColor: grayMed, padding: 12 },
        summaryCardTitle: { fontSize: 9, fontWeight: "bold", color: navy, marginBottom: 8 },
        summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
        summaryLabel: { fontSize: 8.5, color: grayText },
        summaryAmount: { fontSize: 8.5, fontWeight: "bold", color: dark },
        summaryDivider: { height: 1, backgroundColor: grayMed, marginVertical: 6 },
        summaryTotalLabel: { fontSize: 9, fontWeight: "bold", color: navy },
        summaryTotalAmount: { fontSize: 11, fontWeight: "bold", color: navy },
        /* Bar chart representation */
        barContainer: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
        barLabel: { width: 70, fontSize: 8, color: grayText },
        barTrack: { flex: 1, height: 10, backgroundColor: grayLight, borderRadius: 4, overflow: "hidden" },
        barFill: { height: 10, borderRadius: 4, minWidth: 2 },
        barAmount: { width: 75, fontSize: 8, fontWeight: "bold", textAlign: "right", color: dark },
        /* Footer */
        footer: { marginTop: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: grayMed, flexDirection: "row", justifyContent: "space-between" },
        footerText: { fontSize: 7, color: grayText },
      })

      /* Column widths for the table (as flex ratios) */
      const colW = { time: 1.3, type: 0.8, amount: 1.1, method: 1.6, employee: 1, client: 1, voucher: 0.9, notes: 1.4 }
      const amountPadRight = 12

      const getBadgeStyle = (type: string) => {
        if (type === "Ingresos") return s.badgeIncome
        if (type === "Retiros") return s.badgeExpense
        return s.badgeClosure
      }

      /* Max amount for bar chart scaling */
      const maxMethodAbs = Math.max(
        ...paymentMethodSummary.rows.map((r) => Math.abs(r.amount)),
        1,
      )

      const documentDefinition = (
        <Document>
          <Page size="A4" style={s.page}>
            {/* ══ HEADER BANNER ══ */}
            <View style={s.banner}>
              <Text style={s.bannerTitle}>Reporte de Caja Registradora</Text>
              <Text style={s.bannerSub}>
                {selectedStoreName} — {reportDateLabel} — {reportRows.length} movimiento{reportRows.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={s.accentLine} />

            {/* ══ KPI CARDS ══ */}
            <View style={s.kpiRow}>
              <View style={[s.kpiCard, { backgroundColor: blueBg, borderColor: navyLight }]}>
                <Text style={[s.kpiLabel, { color: navyLight }]}>Saldo Inicial</Text>
                <Text style={[s.kpiValue, { color: navy }]}>{`${cs} ${openBal.toFixed(2)}`}</Text>
              </View>
              <View style={[s.kpiCard, { backgroundColor: emeraldBg, borderColor: emerald }]}>
                <Text style={[s.kpiLabel, { color: emerald }]}>Ingresos</Text>
                <Text style={[s.kpiValue, { color: emerald }]}>{`${cs} ${totalIncome.toFixed(2)}`}</Text>
                <Text style={[s.kpiMeta, { color: emerald }]}>{incomeCount} transaccion{incomeCount !== 1 ? "es" : ""}</Text>
              </View>
              <View style={[s.kpiCard, { backgroundColor: redBg, borderColor: red }]}>
                <Text style={[s.kpiLabel, { color: red }]}>Egresos</Text>
                <Text style={[s.kpiValue, { color: red }]}>{`${cs} ${totalExpense.toFixed(2)}`}</Text>
                <Text style={[s.kpiMeta, { color: red }]}>{expenseCount} retiro{expenseCount !== 1 ? "s" : ""}</Text>
              </View>
              <View style={[s.kpiCard, { backgroundColor: tealBg, borderColor: teal }]}>
                <Text style={[s.kpiLabel, { color: teal }]}>Efectivo Disp.</Text>
                <Text style={[s.kpiValue, { color: teal }]}>{`${cs} ${cashIncomeTotal.toFixed(2)}`}</Text>
                {closureCount > 0 && <Text style={[s.kpiMeta, { color: amber }]}>{closureCount} cierre{closureCount !== 1 ? "s" : ""}</Text>}
              </View>
            </View>

            {/* ══ TRANSACTIONS TABLE ══ */}
            <Text style={s.sectionTitle}>Detalle de Movimientos</Text>
            <View style={s.tableContainer}>
              {/* Header */}
              <View style={s.tHeader}>
                <Text style={[s.tHeaderText, { flex: colW.time }]}>Fecha/Hora</Text>
                <Text style={[s.tHeaderText, { flex: colW.type, textAlign: "center" }]}>Tipo</Text>
                <Text style={[s.tHeaderText, { flex: colW.amount, textAlign: "right", paddingRight: amountPadRight }]}>Monto</Text>
                <Text style={[s.tHeaderText, { flex: colW.method, paddingLeft: 4 }]}>Met. Pago</Text>
                <Text style={[s.tHeaderText, { flex: colW.employee }]}>Encargado</Text>
                <Text style={[s.tHeaderText, { flex: colW.client }]}>Cliente</Text>
                <Text style={[s.tHeaderText, { flex: colW.voucher }]}>Comprobante</Text>
                <Text style={[s.tHeaderText, { flex: colW.notes }]}>Notas</Text>
              </View>
              {/* Rows */}
              {reportRows.map((row, idx) => (
                <View
                  key={`${row.timestamp}-${idx}`}
                  style={[s.tRow, idx % 2 === 0 ? s.tRowEven : {}]}
                >
                  <Text style={[s.tCell, { flex: colW.time }]}>{row.timestamp}</Text>
                  <View style={{ flex: colW.type, alignItems: "center", justifyContent: "center" }}>
                    <Text style={getBadgeStyle(row.type)}>{row.type}</Text>
                  </View>
                  <Text style={[s.tCell, s.tCellRight, { flex: colW.amount, paddingRight: amountPadRight, fontWeight: row.type === "Retiros" ? "bold" : "normal", color: row.type === "Retiros" ? red : row.type === "Ingresos" ? emerald : dark }]}>
                    {row.amount}
                  </Text>
                  <Text style={[s.tCell, { flex: colW.method, paddingLeft: 4 }]}>{row.paymentMethods}</Text>
                  <Text style={[s.tCell, s.tCellMuted, { flex: colW.employee }]}>{row.employee}</Text>
                  <Text style={[s.tCell, { flex: colW.client }]}>{row.client}</Text>
                  <Text style={[s.tCell, s.tCellMuted, { flex: colW.voucher }]}>{row.voucher}</Text>
                  <Text style={[s.tCell, s.tCellMuted, { flex: colW.notes }]} wrap>{row.notes !== "-" ? row.notes : ""}</Text>
                </View>
              ))}
            </View>

            {/* ══ SUMMARY SECTION ══ */}
            <View style={s.summaryGrid}>
              {/* Left: Payment method breakdown with bars */}
              <View style={[s.summaryCard, { flex: 2 }]}>
                <Text style={s.summaryCardTitle}>Desglose por Metodo de Pago</Text>
                {paymentMethodSummary.rows.map((row) => {
                  const absAmt = Math.abs(row.amount)
                  const pct = maxMethodAbs > 0 ? (absAmt / maxMethodAbs) * 100 : 0
                  const barColor = row.amount >= 0 ? emerald : red
                  return (
                    <View key={row.method} style={s.barContainer}>
                      <Text style={s.barLabel}>{row.label}</Text>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${Math.max(pct, 1)}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={[s.barAmount, { color: row.amount >= 0 ? emerald : red }]}>
                        {formatSignedCurrency(row.amount, cs)}
                      </Text>
                    </View>
                  )
                })}
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.summaryTotalLabel}>TOTAL NETO</Text>
                  <Text style={s.summaryTotalAmount}>
                    {formatSignedCurrency(paymentMethodSummary.total, cs)}
                  </Text>
                </View>
              </View>

              {/* Right: Quick summary */}
              <View style={[s.summaryCard, { flex: 1 }]}>
                <Text style={s.summaryCardTitle}>Resumen del Dia</Text>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Saldo Apertura</Text>
                  <Text style={s.summaryAmount}>{`${cs} ${openBal.toFixed(2)}`}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: emerald }]}>+ Ingresos</Text>
                  <Text style={[s.summaryAmount, { color: emerald }]}>{`${cs} ${totalIncome.toFixed(2)}`}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: red }]}>- Egresos</Text>
                  <Text style={[s.summaryAmount, { color: red }]}>{`${cs} ${totalExpense.toFixed(2)}`}</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.summaryTotalLabel}>Efectivo Esperado</Text>
                  <Text style={s.summaryTotalAmount}>{`${cs} ${cashIncomeTotal.toFixed(2)}`}</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Total Movimientos</Text>
                  <Text style={s.summaryAmount}>{reportRows.length}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: emerald }]}>Ventas</Text>
                  <Text style={s.summaryAmount}>{incomeCount}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: red }]}>Retiros</Text>
                  <Text style={s.summaryAmount}>{expenseCount}</Text>
                </View>
                {closureCount > 0 && (
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryLabel, { color: amber }]}>Cierres</Text>
                    <Text style={s.summaryAmount}>{closureCount}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ══ FOOTER ══ */}
            <View style={s.footer}>
              <Text style={s.footerText}>
                {selectedStoreName} — Generado: {format(new Date(), "dd/MM/yyyy HH:mm")}
              </Text>
              <Text style={s.footerText}>
                Reporte de Caja — {reportDateLabel}
              </Text>
            </View>
          </Page>
        </Document>
      )

      const blob = await pdf(documentDefinition).toBlob()
      downloadBlob(blob, `reporte-caja-${reportFileDate}.pdf`)
      toast.success("Reporte PDF generado correctamente.")
    } catch (error) {
      console.error("Error generando PDF de caja:", error)
      toast.error("No se pudo generar el PDF. Intentalo de nuevo.")
    } finally {
      setIsGeneratingPdf(false)
    }
  }
  // -------------------- FUNCIONES --------------------
  // Nueva funciÃƒÂ³n para recargar balance y transacciones
  const refreshCashData = useCallback(
    async (
      targetStoreId?: number,
      storeNameMapOverride?: Record<number, string>,
    ) => {
      const effectiveStoreId = targetStoreId ?? storeIdRef.current;
      if (effectiveStoreId === null) {
        return;
      }

      try {
        const [activeRegister, newTransactions, closuresResponse] = await Promise.all([
          getActiveCashRegister(effectiveStoreId),
          getTodayTransactions(effectiveStoreId),
          getClosuresByStore(effectiveStoreId),
        ]);

        if (activeRegister) {
          setActiveCashRegisterId(activeRegister.id);
          setBalance(Number(activeRegister.currentBalance));
          setInitialBalance(Number(activeRegister.initialBalance));
          setHasCashRegister(true);
        } else {
          setActiveCashRegisterId(null);
          setBalance(0);
          setInitialBalance(0);
          setHasCashRegister(false);
        }

        const safeTransactions = Array.isArray(newTransactions) ? newTransactions : [];
        const validTransactions = safeTransactions.map((transaction: any) =>
          adaptTransaction(transaction),
        );
        const mergedTransactions = mergeSaleTransactions(validTransactions);

        const sortedClosuresRaw = Array.isArray(closuresResponse)
          ? sortClosuresByDateDesc(closuresResponse)
          : [];
        const { amount: latestClosureOverride } =
          resolveLatestClosureOverride(activeRegister, sortedClosuresRaw);
        const closuresWithOverride = withLatestClosureOverride(
          sortedClosuresRaw,
          latestClosureOverride,
        );
        const nextOpeningMap = computeClosureNextOpeningMap(
          closuresWithOverride,
          latestClosureOverride,
        );
        const closuresWithNextOpening = applyNextOpeningBalanceToClosures(
          closuresWithOverride,
          nextOpeningMap,
        );
        const transactionsWithNextOpening = applyNextOpeningBalanceToTransactions(
          mergedTransactions,
          nextOpeningMap,
        );

        const storeNamesLookup = storeNameMapOverride ?? storeNameLookup;
        const transactionsWithStoreNames = decorateTransactionsWithStoreNames(
          transactionsWithNextOpening,
          storeNamesLookup,
        );

        setClosureNextOpeningLookup(Object.fromEntries(nextOpeningMap.entries()));
        const income = transactionsWithStoreNames
          .filter((t: any) => t.internalType === "INCOME")
          .reduce((sum: any, t: any) => sum + t.amount, 0);

        const expense = transactionsWithStoreNames
          .filter((t: any) => t.internalType === "EXPENSE")
          .reduce((sum: any, t: any) => sum + t.amount, 0);

        setTransactions(transactionsWithStoreNames);
        setTotalIncome(income);
        setTotalExpense(expense);
        setClosures(closuresWithNextOpening);

        console.log("? Recalculado totalIncome:", income);
        console.log("? Recalculado totalExpense:", expense);
      } catch (error) {
        console.error("Error actualizando datos de caja:", error);
        setClosureNextOpeningLookup({});
      }
    },
    [storeNameLookup],
  );

  const refreshCashDataRef = useRef(refreshCashData);
  useEffect(() => {
    refreshCashDataRef.current = refreshCashData;
  }, [refreshCashData]);

  const reinitializeCashRegister = async (): Promise<string | null> => {
    if (!storeId) return null;
      try {
      const res = await getActiveCashRegister(storeId);
      const userData = await getUserDataFromToken();
  
      if (res) {
        setActiveCashRegisterId(res.id);
        setBalance(Number(res.currentBalance));
        setInitialBalance(Number(res.initialBalance));
        setHasCashRegister(true);
      } else {
        setActiveCashRegisterId(null);
        setBalance(0);
        setInitialBalance(0);
        setHasCashRegister(false);
      }
  
      return userData?.name ?? null; // Ã°Å¸â€˜Ë† garantizamos que es string o null
      } catch (error) {
      console.error("Error al reiniciar caja:", error);
      setActiveCashRegisterId(null);
      setBalance(0);
      setInitialBalance(0);
      setHasCashRegister(false);
      return null;
    }
  };

  const handleRequestOpenCashRegister = () => {
    if (!storeId) return;

    const lastClosureAmount =
      closures.length > 0 ? Number(closures[0].closingBalance || 0) : 0;
    setInitialAmountToOpen(lastClosureAmount); // pre-fill with last closure or 0
    setShowOpenCashDialog(true); // abre el diÃƒÂ¡logo
  };

  useEffect(() => {
    if (!selectedDate || !Array.isArray(closures) || closures.length === 0) {
      setDailyClosureInfo(null);
      return;
    }

    const closureOfDay = closures.reduce((latest: any | null, closure: any) => {
      if (!closure || !closure.createdAt) {
        return latest;
      }

      const createdAt = new Date(closure.createdAt);
      if (!isSameDay(createdAt, selectedDate)) {
        return latest;
      }

      if (!latest || !latest.createdAt) {
        return closure;
      }

      const latestDate = new Date(latest.createdAt);
      return createdAt > latestDate ? closure : latest;
    }, null);

    if (!closureOfDay) {
      setDailyClosureInfo(null);
      return;
    }

    setDailyClosureInfo({
      openingBalance: Number(closureOfDay.openingBalance ?? 0),
      closingBalance: Number(closureOfDay.closingBalance ?? 0),
    });
  }, [closures, selectedDate]);

   // -------------------- USE EFFECTS --------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchStores() {
      try {
        const data = await getStores();
        if (cancelled) {
          return;
        }

        const normalizedStores = (Array.isArray(data) ? data : []).map((store: any) => ({
          ...store,
          id: Number(store.id),
        }));

        const sortedStores = normalizedStores.sort((a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name),
        );
        setStores(sortedStores);

        if (sortedStores.length === 0) {
          setStoreId(null);
          setActiveCashRegisterId(null);
          setHasCashRegister(false);
          setBalance(0);
          setInitialBalance(0);
          setTransactions([]);
          setClosures([]);
          setTenantRefreshKey((prev) => prev + 1);
          return;
        }

        const currentStoreId = storeIdRef.current;
        const nextStoreId = sortedStores.some((store) => store.id === currentStoreId)
          ? currentStoreId ?? sortedStores[0].id
          : sortedStores[0].id;

        const nextStoreLookup = sortedStores.reduce<Record<number, string>>((acc, store) => {
          acc[store.id] = store.name;
          return acc;
        }, {});

        if (storeIdRef.current !== nextStoreId) {
          setStoreId(nextStoreId);
        }
        setSelectedDate(new Date());
        const refreshFn = refreshCashDataRef.current;
        if (typeof refreshFn === "function") {
          await refreshFn(nextStoreId, nextStoreLookup);
        }
        setTenantRefreshKey((prev) => prev + 1);
      } catch (error) {
        if (!cancelled) {
          console.error("Error al obtener las tiendas:", error);
          setStores([]);
          setStoreId(null);
          setActiveCashRegisterId(null);
          setHasCashRegister(false);
          setBalance(0);
          setInitialBalance(0);
          setTransactions([]);
          setClosures([]);
          setTenantRefreshKey((prev) => prev + 1);
        }
      }
    }

    fetchStores();

    if (typeof window === "undefined") {
      return () => {
        cancelled = true;
      };
    }

    const handler = () => {
      fetchStores();
    };

    window.addEventListener(TENANT_SELECTION_EVENT, handler);
    return () => {
      cancelled = true;
      window.removeEventListener(TENANT_SELECTION_EVENT, handler);
    };
  }, []);

  // Obtener el balance de la caja activa al cambiar la tienda seleccionada
  useEffect(() => {
    if (storeId === null) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [activeRegister, closuresData] = await Promise.all([
          getActiveCashRegister(storeId).catch(() => null),
          getClosuresByStore(storeId).catch((err) => {
            console.error("Error al obtener cierres:", err);
            return [] as any[];
          }),
        ]);

        if (cancelled) {
          return;
        }

        if (activeRegister) {
          setActiveCashRegisterId(activeRegister.id);
          setBalance(Number(activeRegister.currentBalance));
          setInitialBalance(Number(activeRegister.initialBalance));
          setHasCashRegister(true);
        } else {
          setActiveCashRegisterId(null);
          setBalance(0);
          setInitialBalance(0);
          setHasCashRegister(false);
        }

        const sortedClosures = Array.isArray(closuresData)
          ? sortClosuresByDateDesc(closuresData)
          : [];
        const { amount: latestClosureOverride } = resolveLatestClosureOverride(
          activeRegister,
          sortedClosures,
        );
        const closuresWithOverride = withLatestClosureOverride(sortedClosures, latestClosureOverride);

        setClosures(closuresWithOverride);
      } catch (error) {
        if (!cancelled) {
          console.error("Error al obtener datos de caja:", error);
          setActiveCashRegisterId(null);
          setBalance(0);
          setInitialBalance(0);
          setHasCashRegister(false);
          setClosures([]);
        }
      }
      try {
        const currentBalance = await getCashRegisterBalance(storeId);
        if (cancelled) {
          return;
        }

        if (currentBalance === null) {
          setBalance(0);
          setHasCashRegister(false);
        } else {
          setBalance(Number(currentBalance));
          setHasCashRegister(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error real al obtener el balance:", error);
          setBalance(0);
          setHasCashRegister(false);
        }
      }
    };  
    loadData();

    return () => {
      cancelled = true;
    };
  }, [storeId, tenantRefreshKey]);

  useEffect(() => {
  if (storeId === null || !selectedDate) return;

  let cancelled = false;
    setIsFetchingTransactions(true);

  const load = async (): Promise<void> => {
      try {
      const datesToFetch = new Set<string>();

        const collectDateStrings = (date: Date) => {
          const baseString = ymdLocal(date);
          datesToFetch.add(baseString);

          const timezoneOffsetMinutes = date.getTimezoneOffset();
          if (timezoneOffsetMinutes > 0) {
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            datesToFetch.add(ymdLocal(nextDate));
          } else if (timezoneOffsetMinutes < 0) {
            const prevDate = new Date(date);
            prevDate.setDate(prevDate.getDate() - 1);
            datesToFetch.add(ymdLocal(prevDate));
          }
        }; 

        collectDateStrings(selectedDate);

        if (isToday && latestClosureTimestamp) {
          const startDate = new Date(latestClosureTimestamp);
          startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(selectedDate);
          endDate.setHours(0, 0, 0, 0);

          if (startDate <= endDate) {
            for (
              let cursor = new Date(startDate);
              cursor <= endDate;
              cursor.setDate(cursor.getDate() + 1)
            ) {
              collectDateStrings(cursor);
            }
          }
        }

        // Almacenar todas las fechas garantiza incluir retiros realizados
        // inmediatamente después del cierre anterior aunque pertenezcan al
        // día calendario previo, evitando que se omitan en el saldo esperado.
        const fetchDates = Array.from(datesToFetch);
        const responses = await Promise.all(
          fetchDates.map(async (dateString) => {
      try {
              const data = await getTransactionsByDate(storeId, dateString);
              return Array.isArray(data) ? data : [];
      } catch (error) {
              console.error(`Error al obtener transacciones para la fecha ${dateString}:`, error);
              return [];
            }
          }),
        );

        if (cancelled) return;

        const flattenedTransactions = responses.flat();
        const transactionsById = new Map<string, any>();

        flattenedTransactions.forEach((transaction) => {
          if (!transaction) return;

        const transactionId = String(transaction.id);
          if (!transactionsById.has(transactionId)) {
            transactionsById.set(transactionId, transaction);
          }
        });

        const adaptedTransactions = Array.from(transactionsById.values()).map((t: any) =>
          adaptTransaction(t),
        );

        const merged = mergeSaleTransactions(adaptedTransactions);
        const nextOpeningMap = new Map<string, number>(Object.entries(closureNextOpeningLookup));
        const mergedWithNextOpening = applyNextOpeningBalanceToTransactions(merged, nextOpeningMap);

        if (!cancelled) {
          const mergedWithStoreNames = decorateTransactionsWithStoreNames(
            mergedWithNextOpening,
            storeNameLookup,
          );

          setTransactionsForBalance(mergedWithStoreNames);

          const filteredBySelectedDate = mergedWithStoreNames.filter((transaction) =>
            isSameDay(transaction.timestamp, selectedDate),
          );

          setTransactions(filteredBySelectedDate);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error al obtener transacciones por fecha:", error);
          setTransactions([]);
          setTransactionsForBalance([]);
        }
      } finally {
        if (!cancelled) setIsFetchingTransactions(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [storeId, selectedDate, isToday, latestClosureTimestamp, closureNextOpeningLookup, storeNameLookup, tenantRefreshKey]);

  useEffect(() => {
    // Solo considera transacciones vÃƒÂ¡lidas (evita CLOSURE)
    const financialTransactions = transactions.filter(
      (t) => t.internalType === "INCOME" || t.internalType === "EXPENSE"
    );
  
    const income = financialTransactions
      .filter((t) => t.internalType === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
  
    const expense = financialTransactions
      .filter((t) => t.internalType === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
  
    setTotalIncome(income);
    setTotalExpense(expense);
  
    console.log("Ingresos calculados:", income);
    console.log("Egresos calculados:", expense);
  }, [transactions]);

  useEffect(() => {
    if (storeId !== null) {
      getActiveCashRegister(storeId)
        .then((res) => {
          if (res) {
            setActiveCashRegisterId(res.id);
          } else {
            setActiveCashRegisterId(null);
          }
        })
        .catch(() => setActiveCashRegisterId(null));
    }
  }, [storeId]);

  const financialTransactions = transactions.filter(
    (t) => t.internalType === "INCOME" || t.internalType === "EXPENSE"
  );

  // Mostrar loader mientras se revisa sesiÃƒÂ³n
  if (checkingSession) {
    return <div className="p-8 text-center">Verificando sesion...</div>;
  }

  // -------------------- UI --------------------

  return (
    <div className="grid gap-6">

      {/* Selector de tienda */}
      <div>
        <label htmlFor="store-select" className="block text-sm font-medium mb-1">
          Seleccionar Tienda
        </label>
        <Select
          value={storeId !== null ? String(storeId) : ""}
          onValueChange={(value:any) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              setStoreId(parsed);
              refreshCashData(parsed);
            } else {
              setStoreId(null);
              setTransactions([]);
              setClosures([]);
              setTotalIncome(0);
              setTotalExpense(0);
              setBalance(0);
              setInitialBalance(0);
              setHasCashRegister(false);
              setActiveCashRegisterId(null);
              setClosureNextOpeningLookup({});
            }
          }}
        >
          <SelectTrigger id="store-select" className="w-full">
            <SelectValue placeholder="Seleccione una tienda" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store) => (
              <SelectItem key={store.id} value={String(store.id)}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!hasCashRegister && storeId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Caja Cerrada</CardTitle>
              <CardDescription>No hay una caja activa para esta tienda.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleRequestOpenCashRegister} 
                size="sm" 
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Abrir Nueva Caja
              </Button>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showOpenCashDialog} onOpenChange={setShowOpenCashDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abrir nueva caja</AlertDialogTitle>
              <AlertDialogDescription>
                El saldo inicial sugerido es el del Ultimo cierre: 
                <strong className="text-green-600"> S/. {initialAmountToOpen.toFixed(2)}</strong>.
                Puedes modificarlo si es necesario.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Saldo Inicial</label>
              <Input
                type="number"
                value={initialAmountToOpen}
                onChange={(e) => setInitialAmountToOpen(Number(e.target.value))}
                step="0.01"
                min="0"
              />
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
      try {
                    const newName = `Caja Principal - Tienda ${storeId} - ${Date.now()}`;
                    await createCashRegister({
                      storeId,
                      initialBalance: initialAmountToOpen,
                      name: newName,
                    });
                    toast.success("Caja creada exitosamente");
                    await refreshCashData();
      } catch (error: any) {
                    console.error("Error al abrir nueva caja:", error);
                    toast.error("No se pudo crear la caja.");
                  } finally {
                    setShowOpenCashDialog(false);
                  }
                }}
              >
                Confirmar Apertura
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {isSameDay(selectedDate, new Date()) ? "Saldo Actual" : `Saldo del ${format(selectedDate, "dd/MM/yyyy")}`}
            </CardTitle>
            <CardDescription>
              {isSameDay(selectedDate, new Date()) ? "Dinero de todas las operaciones en caja hoy" : "Dinero de todas las operaciones en caja segun ultimo cierre de ese dia"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isSameDay(selectedDate, new Date()) && hasCashRegister && !isNaN(Number(balance)) ? (
                `S/.${Number(balance).toFixed(2)}`
              ) : dailyClosureInfo ? (
                `S/.${Number(dailyClosureInfo.closingBalance).toFixed(2)}`
              ) : (
                "Sin cierre ese di­a"
              )}
            </div>
            {isSameDay(selectedDate, new Date()) && (
              <div className="text-sm text-muted-foreground mt-2">
                Dinero en efectivo disponible hoy: {`${paymentMethodSummary.currencySymbol} ${cashIncomeTotal.toFixed(2)}`}
              </div>
            )}
            {openingBalanceForDisplay !== null && (
              <div className="text-sm text-muted-foreground mt-1">
                Saldo inicial(En Efectivo): S/. {Number(openingBalanceForDisplay).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
          <CardTitle>
            {isToday
              ? "Transacciones del dia de hoy"
              : `Transacciones del dia ${selectedDate.toLocaleDateString("es-PE", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}`}
          </CardTitle>
            <CardDescription>Numero de movimientos en caja</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {financialTransactions.length > 0 ? financialTransactions.length : '0'} {/* Mostrar el nÃƒÂºmero total de transacciones */}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Ultimo Cierre</CardTitle>
            <CardDescription>Historial de cierres de caja</CardDescription>
          </CardHeader>
          <CardContent>
            {closures.length > 0 ? (
              <>
                <div className="text-lg font-semibold">
                  {new Date(closures[0].createdAt).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Monto de cierre:{" "}
                  <span className="font-medium">
                    S/. {Number(closures[0]?.closingBalance ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total de cierres: {closures.length}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                No hay cierres registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transfer" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transfer">
            <span className="block sm:hidden">Transferencias</span>
            <span className="hidden sm:block">Transferencia de Dinero</span>
          </TabsTrigger>
          <TabsTrigger value="closure">
            <span className="block sm:hidden">Cierres</span>
            <span className="hidden sm:block">Cierre de Efectivo</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            <span className="block sm:hidden">Historial</span>
            <span className="hidden sm:block">Historial de Transacciones</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Transferencia de Dinero</CardTitle>
              <CardDescription>Registrar depositos y retiros de la caja registradora</CardDescription>
            </CardHeader>
            <CardContent>
            {storeId !== null && userId !== null && activeCashRegisterId !== null && (
              <CashTransferForm
                key={`transfer-${tenantRefreshKey}-${storeId}-${activeCashRegisterId}`}
                currentBalance={balance}
                storeId={storeId}
                refreshData={refreshCashData} // Ã°Å¸â€˜Ë† nuevo
              />
            )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="closure">
          <Card>
            <CardHeader>
              <CardTitle>Cierre de Efectivo</CardTitle>
              <CardDescription>
              Registrar depositos y retiros de la caja registradora</CardDescription>
            </CardHeader>
            <CardContent>
            {storeId !== null && userId !== null && activeCashRegisterId !== null && (
              <CashClosureForm
                key={`closure-${tenantRefreshKey}-${storeId}-${activeCashRegisterId}`}
                storeId={storeId!}
                cashRegisterId={activeCashRegisterId} // Ã°Å¸â€˜Ë† id de la tienda/caja (nunca serÃƒÂ¡ null porque ya haces validaciÃƒÂ³n arriba)
                userId={userId} // Ã°Å¸â€˜Ë† tienes que obtener el userId del localStorage o sesiÃƒÂ³n
                currentBalance={balance}
                openingBalance={closureFormOpeningBalance} // Ã°Å¸â€˜Ë† tienes que calcularlo
                totalIncome={totalIncome} // Ã°Å¸â€˜Ë† tienes que calcularlo
                totalExpense={totalExpense} // Ã°Å¸â€˜Ë† tienes que calcularlo
                onClosureCompleted={refreshCashData}
                reinitializeCashRegister={reinitializeCashRegister}
                currencySymbol={paymentMethodSummary.currencySymbol}
                cashIncomeTotal={cashIncomeTotal}
              />
            )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div className="space-y-1">
                <CardTitle>Historial de Transacciones</CardTitle>
                <CardDescription>Ver todas las transacciones de la caja registradora</CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleExportExcel}
                  disabled={isReportEmpty}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar Excel
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={handleExportPdf}
                  disabled={isReportEmpty || isGeneratingPdf}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isGeneratingPdf ? "Generando PDF..." : "Exportar PDF"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionHistory
                key={`history-${tenantRefreshKey}-${storeId ?? "none"}`}
                transactions={transactions}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                // Ã°Å¸â€˜â€¡ estos dos props solo si estÃƒÂ¡s usando la versiÃƒÂ³n antiflicker del hijo
                isFetching={isFetchingTransactions}
                keepPrevious
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
