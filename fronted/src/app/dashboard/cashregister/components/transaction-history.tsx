"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Calculator, Search, ChevronDown, ChevronUp, Calendar, X } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format, isSameDay } from "date-fns"
import { BACKEND_URL } from "@/lib/utils"
import { Transaction } from "../types/cash-register"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const COMPANY_RUC = process.env.NEXT_PUBLIC_COMPANY_RUC ?? "20519857538"

const cleanValue = (value?: string | null) => {
  if (!value) return ""
  return value.replace(/[;]+$/g, "").trim()
}

// añade estas 2 líneas en la interfaz:
interface TransactionHistoryProps {
  transactions: Transaction[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isFetching?: boolean;   // 👈 nuevo
  keepPrevious?: boolean; // 👈 nuevo
}

type StructuredNoteEntry = {
  label: string
  value: string
}

type SaleDetailItem = {
  name: string
  quantity: number
  unitPrice: number
  total: number
}

type ClosureOperationDetail = {
    id: string
    timestamp: Date | null
  employee: string
  amount: number
  type: "INCOME" | "EXPENSE"
  currencySymbol: string
  description: string
  clientName: string | null
  clientDocument: string | null
  voucher: string | null
  saleItems: SaleDetailItem[]
  notes: string | null
  paymentMethods: Array<{
    label: string
    amountText: string | null
    raw: string
  }>
}

const SALE_DESCRIPTION_MARKER = "venta registrada:"

const parseLocaleNumber = (value: string) => {
  const sanitized = value.replace(/[^0-9,.-]/g, "").trim()
  if (!sanitized) return 0

  const hasComma = sanitized.includes(",")
  const hasDot = sanitized.includes(".")

  let normalized = sanitized
  if (hasComma && hasDot) {
    normalized =
      sanitized.lastIndexOf(",") > sanitized.lastIndexOf(".")
        ? sanitized.replace(/\./g, "").replace(",", ".")
        : sanitized.replace(/,/g, "")
  } else if (hasComma) {
    normalized = sanitized.replace(/\./g, "").replace(",", ".")
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const removePaymentMethodSegments = (value: string) => {
  if (!value) return ""

  return normalizeWhitespace(
    value
      .replace(/m[eé]todos?\s+de\s+pago\s*:[^|]+/gi, " ")
      .replace(/pagado\s+con[^|]+/gi, " ")
      .replace(/pago\s+con[^|]+/gi, " ")
  )
}

const parseSaleItemsFromDescription = (description?: string | null) => {
  if (!description) {
    return { items: [] as SaleDetailItem[], notes: "" }
  }

  const normalizedDescription = normalizeWhitespace(description)
  if (!normalizedDescription) {
    return { items: [] as SaleDetailItem[], notes: "" }
  }

  const lowerDescription = normalizedDescription.toLowerCase()
  const markerIndex = lowerDescription.indexOf(SALE_DESCRIPTION_MARKER)

  if (markerIndex === -1) {
    return { items: [] as SaleDetailItem[], notes: normalizedDescription }
  }

  const prefix = normalizedDescription.slice(0, markerIndex).trim()
  const saleSegment = normalizedDescription
    .slice(markerIndex + SALE_DESCRIPTION_MARKER.length)
    .trim()

  const matches = Array.from(
    saleSegment.matchAll(/([^|]+?)\s*(?:[-–—])?\s*Cantidad:\s*([0-9.,]+)\s*,\s*Precio\s*Unitario:\s*([0-9.,]+)/gi),
  )

  const items = matches
    .map((match) => {
      const rawName = match[1] ?? ""
      const quantity = parseLocaleNumber(match[2] ?? "0")
      const unitPrice = parseLocaleNumber(match[3] ?? "0")
      const cleanedName = normalizeWhitespace(
        rawName.replace(/^[\-|]+/, "").replace(/[\-|]+$/, ""),
      )

      if (!cleanedName) {
        return null
      }

      return {
        name: toSentenceCase(cleanedName),
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      }
    })
    .filter((item): item is SaleDetailItem => item !== null)

  let remainderSegment = saleSegment
  matches.forEach((match) => {
    remainderSegment = remainderSegment.replace(match[0], " ")
  })
  remainderSegment = remainderSegment.replace(/[|]+/g, " ")

  const cleanedPrefix = removePaymentMethodSegments(prefix)
  const cleanedRemainder = removePaymentMethodSegments(remainderSegment)

  const combinedNotes = [cleanedPrefix, cleanedRemainder]
    .map((segment) => normalizeWhitespace(segment))
    .filter((segment) => segment.length > 0)
    .join(". ")

  return {
    items,
    notes: combinedNotes,
  }
}

const formatCurrency = (amount: number, currencySymbol: string) =>
  `${currencySymbol} ${amount.toFixed(2)}`

const roundToTwo = (value: number) => Number(value.toFixed(2))

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

const isCashPaymentMethod = (method: string) =>
  removeDiacritics(method).toLowerCase().includes("efectivo")

const formatAmountWithSign = (
  amount: number,
  type: string | null | undefined,
  currencySymbol: string,
) => {
  const normalizedAmount = Number.isFinite(amount) ? Math.abs(amount) : 0
  const formatted = formatCurrency(normalizedAmount, currencySymbol)
  return type === "EXPENSE" ? `- ${formatted}` : formatted
}

const formatPaymentAmountText = (amountText: string, isExpense: boolean) => {
  const trimmed = amountText.trim()
  if (!trimmed) {
    return amountText
  }

  if (!isExpense || trimmed.startsWith("-")) {
    return trimmed
  }

  return `- ${trimmed}`
}

const splitPaymentMethodEntry = (entry: string) => {
  const colonIndex = entry.indexOf(":")
  if (colonIndex === -1) {
    return {
      label: toSentenceCase(normalizeWhitespace(entry)),
      amountText: null as string | null,
    }
  }

  const label = normalizeWhitespace(entry.slice(0, colonIndex))
  const amountText = normalizeWhitespace(entry.slice(colonIndex + 1))

  return {
    label: toSentenceCase(label),
    amountText: amountText.length > 0 ? amountText : null,
  }
}

const formatSaleDescription = (description?: string | null) => {
    if (!description) return ""

    const label = "venta registrada:"
    const lowerDescription = description.toLowerCase()
    const labelIndex = lowerDescription.indexOf(label)

    if (labelIndex === -1) {
      return description.trim()
    }

    const originalLabel = description.slice(labelIndex, labelIndex + label.length)
    const prefix = description.slice(0, labelIndex).trimEnd()
    const details = description.slice(labelIndex + label.length).trim()

    const quantityIndex = details.toLowerCase().indexOf("cantidad:")
    const seriesIndex = details.toLowerCase().indexOf("series:")

    let productSegment = details
    if (quantityIndex !== -1) {
      productSegment = details.slice(0, quantityIndex)
    } else if (seriesIndex !== -1) {
      productSegment = details.slice(0, seriesIndex)
    }
    const productSegmentForRemoval = productSegment
    const cleanedProductSegment = productSegment.replace(/^[-\s]+/, "").replace(/[-\s]+$/, "").trim()

    const quantityMatch = details.match(/Cantidad:\s*([^,;]+)/i)
    const priceMatch = details.match(/Precio\s*Unitario:\s*([^,;]+)/i)
    const seriesMatch = details.match(/Series:\s*([^;]+)/i)

    const formattedParts: string[] = []
    const productPart = cleanValue(cleanedProductSegment)
    if (productPart) {
      formattedParts.push(`${originalLabel.trim()} ${productPart}`.trim())
    } else {
      formattedParts.push(originalLabel.trim())
    }

    if (seriesMatch?.[1]) {
      formattedParts.push(`Series: ${cleanValue(seriesMatch[1])}`)
    }

    const quantityPieces: string[] = []
    if (quantityMatch?.[1]) {
      quantityPieces.push(`Cantidad: ${cleanValue(quantityMatch[1])}`)
    }
    if (priceMatch?.[1]) {
      quantityPieces.push(`Precio Unitario: ${cleanValue(priceMatch[1])}`)
    }
    if (quantityPieces.length > 0) {
      formattedParts.push(quantityPieces.join(", "))
    }

    const formattedDescription = formattedParts.join(" - ")

    const consumedParts = [
      productSegmentForRemoval,
      quantityMatch?.[0] ?? "",
      priceMatch?.[0] ?? "",
      seriesMatch?.[0] ?? "",
    ]

    let remaining = details
    consumedParts.forEach((part) => {
      if (!part) return
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      remaining = remaining.replace(new RegExp(escaped, "i"), "")
    })
    remaining = remaining.replace(/[-\s,;]+/g, " ").trim()

    const segments = [prefix, formattedDescription, remaining]
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)

    return segments.join(" ").replace(/\s+/g, " ").trim()
  }

const normalizeInvoiceUrl = (invoiceUrl?: string | null) => {
    if (!invoiceUrl) return null
    const trimmed = invoiceUrl.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    return trimmed.startsWith("/") ? `${BACKEND_URL}${trimmed}` : `${BACKEND_URL}/${trimmed}`
  }

const buildInvoiceUrlFromVoucher = (voucher?: string | null) => {
    if (!voucher) return null
    const [rawSerie, rawCorrelativo] = voucher.split("-")
    if (!rawSerie || !rawCorrelativo) return null

    const serie = rawSerie.trim().toUpperCase()
    const correlativo = rawCorrelativo.trim()
    if (!serie || !correlativo) return null

    const prefix = serie.charAt(0)
    let folder: "boleta" | "factura" | null = null
    let code: "03" | "01" | null = null

    if (prefix === "B") {
      folder = "boleta"
      code = "03"
    } else if (prefix === "F") {
      folder = "factura"
      code = "01"
    }

    if (!folder || !code) return null

    const fileName = `${COMPANY_RUC}-${code}-${serie}-${correlativo}.pdf`
    return `${BACKEND_URL}/api/sunat/pdf/${folder}/${fileName}`
  }

const getInvoiceUrl = (transaction: Transaction) => {
  return normalizeInvoiceUrl(transaction.invoiceUrl) ?? buildInvoiceUrlFromVoucher(transaction.voucher)
}

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim()

const sanitizeIncomeNoteValue = (value?: string | null) => {
  if (!value) {
    return ""
  }

  const withoutRedundantPhrase = value.replace(
    /venta realizada\.?(?:\s*\|\s*en\s+efectivo:\s*(?:s\/.?|\$)\s*[0-9.,]+)?/gi,
    " ",
  )

  const segments = withoutRedundantPhrase
    .split("|")
    .map((segment) => normalizeWhitespace(segment))
    .filter((segment) => segment.length > 0)

  return segments.join(" | ")
}

const collapseRepeatedPhrase = (value: string) => {
  const normalized = normalizeWhitespace(value ?? "")
  if (!normalized) {
    return ""
  }

  const parts = normalized.split(" ")
  const length = parts.length

  for (let size = 1; size <= Math.floor(length / 2); size++) {
    if (length % size !== 0) continue

    const segment = parts.slice(0, size).join(" ")
    let matches = true

    for (let index = size; index < length; index += size) {
      const chunk = parts.slice(index, index + size).join(" ")
      if (chunk !== segment) {
        matches = false
        break
      }
    }

    if (matches) {
      return segment
    }
  }

  return normalized
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const toSentenceCase = (value: string) => {
  if (!value) return ""
  const normalized = value.trim()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

type ClosureMetrics = {
  operationsCount: number
  totalAmount: number
  paymentBreakdown: { method: string; amount: number }[]
  operations: ClosureOperationDetail[]
}

const parseAmountFromMethodEntry = (value: string): number | null => {
  if (!value) return null

  const matches = value.match(/-?\d+(?:[.,]\d+)?/g)
  if (!matches || matches.length === 0) {
    return null
  }

  const rawCandidate = matches[matches.length - 1]?.replace(/[^0-9,.-]/g, "") ?? ""
  if (!rawCandidate) {
    return null
  }

  const hasComma = rawCandidate.includes(",")
  const hasDot = rawCandidate.includes(".")

  let normalized = rawCandidate
  if (hasComma && hasDot) {
    if (rawCandidate.lastIndexOf(",") > rawCandidate.lastIndexOf(".")) {
      normalized = rawCandidate.replace(/\./g, "").replace(",", ".")
    } else {
      normalized = rawCandidate.replace(/,/g, "")
    }
  } else if (hasComma) {
    normalized = rawCandidate.replace(/\./g, "").replace(",", ".")
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const parseStructuredNotes = (rawDescription?: string | null, formattedDescription?: string): StructuredNoteEntry[] => {
  const source = normalizeWhitespace(formattedDescription ?? rawDescription ?? "")
  if (!source) return []

  const entries: StructuredNoteEntry[] = []
  const matchedSegments: string[] = []
  const keyValueRegex = /([A-Za-zÁÉÍÓÚÜÑ0-9#()\/\s]+):\s*([\s\S]*?)(?=(?:[A-Za-zÁÉÍÓÚÜÑ0-9#()\/\s]+:\s)|$)/gi

  let match: RegExpExecArray | null
  while ((match = keyValueRegex.exec(source)) !== null) {
    const rawLabel = normalizeWhitespace(match[1])
    const rawValue = normalizeWhitespace(match[2])

    if (!rawLabel) continue

    const collapsedValue = rawValue ? collapseRepeatedPhrase(rawValue) : "-"

    entries.push({
      label: toSentenceCase(rawLabel),
      value: collapsedValue || "-",
    })

    matchedSegments.push(match[0])
  }

  let remainingText = source
  matchedSegments.forEach((segment) => {
    const pattern = new RegExp(escapeRegExp(segment), "gi")
    remainingText = remainingText.replace(pattern, " ")
  })

  const extraSentences = remainingText
    .split(/(?:(?<=\.)|(?<=;))\s+/)
    .map((sentence) => sentence.replace(/[-\s]+$/g, "").trim())
    .filter((sentence) => sentence.length > 0)

  extraSentences.forEach((sentence, index) => {
    entries.push({
      label: index === 0 && entries.length === 0 ? "Detalle" : `Detalle ${index + 1}`,
      value: collapseRepeatedPhrase(toSentenceCase(sentence)),
    })
  })

  return entries
}

const getTransactionDate = (value: Transaction["timestamp"]) => {
  if (!value) return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsedDate = new Date(value)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

return null
}

export default function TransactionHistory({ transactions, selectedDate, onDateChange, isFetching = false, keepPrevious = true, }: TransactionHistoryProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState<string | null>(null)
    const [modalTransaction, setModalTransaction] = useState<Transaction | null>(null)
    const [sortConfig, setSortConfig] = useState<{
      key: keyof Transaction
      direction: "ascending" | "descending"
    }>({
      key: "timestamp",
      direction: "descending",
    })

    const handleSort = (key: keyof Transaction) => {
      setSortConfig({
        key,
        direction: sortConfig.key === key && sortConfig.direction === "ascending" ? "descending" : "ascending",
      })
    }

    const typeLabels: Record<string, string> = {
      INCOME: "Ingresos",
      EXPENSE: "Retiros",
      CLOSURE: "Cierres",
    };

    const filteredTransactions = transactions.filter((transaction) => {
      const matchesSearch =
        (transaction.employee ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(transaction.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(transaction.amount).includes(searchTerm) ||
        (transaction.voucher ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.clientName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.clientDocument ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.paymentMethods ?? []).some((method) =>
          method.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesType = typeFilter ? transaction.type === typeFilter : true
      return matchesSearch && matchesType
    })

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
      if (sortConfig.key === "amount") {
        return sortConfig.direction === "ascending" ? a.amount - b.amount : b.amount - a.amount
      } else if (sortConfig.key === "timestamp") {
        return sortConfig.direction === "ascending"
          ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      } else {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "ascending" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
        }

        return 0
      }
    })

    const getBadgeColor = (method: string) => {
      switch (method.toLowerCase()) {
        case "en efectivo":
          return "bg-green-50 text-green-700 border-green-200";
        case "yape":
          return "bg-purple-50 text-purple-700 border-purple-200";
        case "plin":
          return "bg-indigo-50 text-indigo-700 border-indigo-200";
        case "visa":
        case "mastercard":
          return "bg-blue-50 text-blue-700 border-blue-200";
        case "transferencia":
          return "bg-yellow-50 text-yellow-700 border-yellow-200";
        default:
          return "bg-gray-50 text-gray-700 border-gray-200";
      }
    };

    const getTransactionIcon = (type: string) => {
      switch (type) {
        case "INCOME":
          return <ArrowDown className="h-4 w-4 text-green-500" />
        case "EXPENSE":
          return <ArrowUp className="h-4 w-4 text-red-500" />
        case "CLOSURE":
          return <Calculator className="h-4 w-4 text-blue-500" />
        default:
          return null
      }
    }

    const getTransactionBadge = (type: string) => {
      switch (type) {
        case "INCOME":
          return (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Ingreso
            </Badge>
          )
        case "EXPENSE":
          return (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              Retiro
            </Badge>
          )
        case "CLOSURE":
          return (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Cierre
            </Badge>
          )
        default:
          return null
      }
    }

    const clearFilters = () => {
      setSearchTerm("")
      setTypeFilter(null)
      onDateChange(new Date()) // 👈 esto reinicia el filtro a hoy
    }

    const { closureDetailsMap, activePeriodMetrics } = useMemo(() => {
      const details = new Map<string, ClosureMetrics>()
      const sortedTransactions = [...transactions].sort((a, b) => {
        const aTime = getTransactionDate(a.timestamp)?.getTime() ?? 0
        const bTime = getTransactionDate(b.timestamp)?.getTime() ?? 0
        return aTime - bTime
      })

      let operationsCount = 0
      let totalAmount = 0
      let paymentAggregates = new Map<string, number>()
      let operations: Transaction[] = []

      const mapOperationsToDetails = (source: Transaction[]): ClosureOperationDetail[] => {
        return source
          .map((operation) => {
            const effectiveType =
              (operation.internalType ?? operation.type) === "EXPENSE" ? "EXPENSE" : "INCOME"
            const saleDetails = parseSaleItemsFromDescription(operation.description)
            const rawSaleNotes =
              effectiveType === "INCOME"
                ? sanitizeIncomeNoteValue(saleDetails.notes)
                : saleDetails.notes ?? ""
            const rawTransactionNotes =
              effectiveType === "INCOME"
                ? sanitizeIncomeNoteValue(operation.notes ?? "")
                : operation.notes ?? ""

            const noteCandidates = [rawSaleNotes, rawTransactionNotes]
              .map((value) => collapseRepeatedPhrase(normalizeWhitespace(value ?? "")))
              .filter((value) => value.length > 0)
              .filter(
                (value, index, array) =>
                  array.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index,
              )

            const description = normalizeWhitespace(
              formatSaleDescription(operation.description) || operation.description || "",
            )

            const paymentEntries = Array.isArray(operation.paymentMethods)
              ? operation.paymentMethods.map((method) => ({
                  ...splitPaymentMethodEntry(method),
                  raw: method,
                }))
              : []

            const clientDocumentParts = [operation.clientDocumentType, operation.clientDocument]
              .map((part) => (part ? normalizeWhitespace(String(part)) : ""))
              .filter((part) => part.length > 0)

            return {
              id: operation.id,
              timestamp: getTransactionDate(operation.timestamp) ?? operation.createdAt ?? null,
              employee: operation.employee || "Sistema",
              amount: Number(operation.amount ?? 0) || 0,
              type: effectiveType,
              currencySymbol: (operation.currency ?? "S/.").trim() || "S/.",
              description: description || paymentEntries.map((entry) => entry.label || entry.raw).join(", ") ||
                `Operación ${operation.id}`,
              clientName: operation.clientName ?? null,
              clientDocument: clientDocumentParts.length > 0 ? clientDocumentParts.join(" ") : null,
              voucher: operation.voucher ?? null,
              saleItems: saleDetails.items,
              notes: noteCandidates.length > 0 ? noteCandidates.join("\n") : null,
              paymentMethods: paymentEntries,
            } as ClosureOperationDetail
          })
          .sort((a, b) => {
            const aTime = a.timestamp?.getTime()
            const bTime = b.timestamp?.getTime()

            if (typeof aTime === "number" && typeof bTime === "number") {
              return aTime - bTime
            }

            if (typeof aTime === "number") {
              return 1
            }

            if (typeof bTime === "number") {
              return -1
            }

            return 0
          })
      }

      const snapshotPaymentAggregates = () =>
        Array.from(paymentAggregates.entries())
          .map(([method, amount]) => ({
            method,
            amount: Number(amount.toFixed(2)),
          }))
          .sort((a, b) => a.method.localeCompare(b.method, "es", { sensitivity: "base" }))

      const addToAggregates = (method: string, amount: number) => {
        const normalizedMethod = toSentenceCase(normalizeWhitespace(method || "Sin método"))
        const current = paymentAggregates.get(normalizedMethod) ?? 0
        paymentAggregates.set(normalizedMethod, current + amount)
      }

      sortedTransactions.forEach((transaction) => {
        const entryType = transaction.internalType ?? transaction.type

        if (entryType === "CLOSURE") {
          details.set(transaction.id, {
            operationsCount,
            totalAmount: Number(totalAmount.toFixed(2)),
            paymentBreakdown: snapshotPaymentAggregates(),
            operations: mapOperationsToDetails(operations),
          })

          operationsCount = 0
          totalAmount = 0
          paymentAggregates = new Map<string, number>()
          operations = []
          return
        }

        if (entryType !== "INCOME" && entryType !== "EXPENSE") {
          return
        }

        operationsCount += 1
        const rawAmount = Number(transaction.amount ?? 0)
        const signedAmount = entryType === "EXPENSE" ? -rawAmount : rawAmount
        totalAmount += signedAmount

        operations.push(transaction)

        const methods = Array.isArray(transaction.paymentMethods) && transaction.paymentMethods.length > 0
          ? transaction.paymentMethods
          : ["Sin método"]

        const parsedEntries = methods.map((method) => ({
          method,
          amount: parseAmountFromMethodEntry(method),
        }))
        const hasExplicitAmounts = parsedEntries.some((item) => item.amount !== null)

        if (hasExplicitAmounts) {
          parsedEntries.forEach(({ method, amount }) => {
            if (amount === null) return
            const signed = entryType === "EXPENSE" ? -amount : amount
            addToAggregates(method, signed)
          })
        } else if (methods.length === 1) {
          addToAggregates(methods[0], signedAmount)
        } else if (methods.length > 1) {
          const splitAmount = signedAmount / methods.length
          methods.forEach((method) => addToAggregates(method, splitAmount))
        }
      })

      return {
        closureDetailsMap: details,
        activePeriodMetrics: {
          operationsCount,
          totalAmount: Number(totalAmount.toFixed(2)),
          paymentBreakdown: snapshotPaymentAggregates(),
          operations: mapOperationsToDetails(operations),
        } as ClosureMetrics,
      }
    }, [transactions])

    const closureSummaries = useMemo(() => {
      return transactions
        .filter((transaction) => (transaction.internalType ?? transaction.type) === "CLOSURE")
        .map((transaction) => {
          const details = closureDetailsMap.get(transaction.id)
          if (!details) {
            return null
          }

          const timestamp =
            getTransactionDate(transaction.timestamp) ?? transaction.createdAt ?? new Date()

          const totalByPaymentMethods = roundToTwo(
            details.paymentBreakdown.reduce((sum, entry) => sum + entry.amount, 0),
          )

          const cashTotal = roundToTwo(
            details.paymentBreakdown
              .filter((entry) => entry.method && isCashPaymentMethod(entry.method))
              .reduce((sum, entry) => sum + entry.amount, 0),
          )

          const currencySymbol = (transaction.currency ?? "S/.").trim() || "S/."
          const noteCandidates = [transaction.notes, transaction.description]
            .map((value) => normalizeWhitespace(value ?? ""))
            .filter((value) => value.length > 0)
          const uniqueNotes = noteCandidates.filter(
            (value, index, array) =>
              array.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index,
          )
          const cleanedNotes = uniqueNotes
            .filter((value) => value.toLowerCase() !== "cierre de caja")
            .join(". ")

          return {
            id: transaction.id,
            timestamp,
            operationsCount: details.operationsCount,
            paymentBreakdown: details.paymentBreakdown,
            operations: details.operations,
            totalByPaymentMethods,
            cashTotal,
            currencySymbol,
            employee: transaction.employee || "Sistema",
            closingBalance:
              transaction.closingBalance !== null && transaction.closingBalance !== undefined
                ? Number(transaction.closingBalance)
                : null,
            openingBalance:
              transaction.openingBalance !== null && transaction.openingBalance !== undefined
                ? Number(transaction.openingBalance)
                : null,
            notes: cleanedNotes.length > 0 ? cleanedNotes : null,
          }
        })
        .filter((entry): entry is {
          id: string
          timestamp: Date
          operationsCount: number
          paymentBreakdown: { method: string; amount: number }[]
          operations: ClosureOperationDetail[]
          totalByPaymentMethods: number
          cashTotal: number
          currencySymbol: string
          employee: string
          closingBalance: number | null
          openingBalance: number | null
          notes: string | null
        } => entry !== null)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }, [closureDetailsMap, transactions])

    const latestClosureSummary = closureSummaries[0] ?? null

    const activeOperationsSummary = useMemo(() => {
      if (!activePeriodMetrics) {
        return null
      }

      const currencyCandidate =
        latestClosureSummary?.currencySymbol ??
        (transactions.find((transaction) => transaction.currency)?.currency ?? "S/.")

      const currencySymbol = (currencyCandidate ?? "S/.").trim() || "S/."

      const totalByPaymentMethods = roundToTwo(
        activePeriodMetrics.paymentBreakdown.reduce((sum, entry) => sum + entry.amount, 0),
      )

      const cashTotal = roundToTwo(
        activePeriodMetrics.paymentBreakdown
          .filter((entry) => entry.method && isCashPaymentMethod(entry.method))
          .reduce((sum, entry) => sum + entry.amount, 0),
      )

      return {
        ...activePeriodMetrics,
        currencySymbol,
        totalByPaymentMethods,
        cashTotal,
      }
    }, [activePeriodMetrics, latestClosureSummary, transactions])

    const hasActiveOperations = Boolean(
      activeOperationsSummary &&
        (activeOperationsSummary.operationsCount > 0 ||
          Math.abs(activeOperationsSummary.totalByPaymentMethods) > 0 ||
          activeOperationsSummary.paymentBreakdown.length > 0),
    )

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    const modalFormattedDescription = modalTransaction ? formatSaleDescription(modalTransaction.description) : ""
    const modalInvoiceUrl = modalTransaction ? getInvoiceUrl(modalTransaction) : null
    const modalCurrency = modalTransaction ? (modalTransaction.currency ?? "S/.").trim() || "S/." : "S/."
    const modalClosureDetails =
      modalTransaction && (modalTransaction.internalType ?? modalTransaction.type) === "CLOSURE"
        ? closureDetailsMap.get(modalTransaction.id)
        : undefined
    const modalSaleDetails = useMemo(
      () => parseSaleItemsFromDescription(modalTransaction?.description),
      [modalTransaction?.description],
    )

    const structuredNotes = useMemo(() => {
      const baseEntries = parseStructuredNotes(
        modalTransaction?.description,
        modalFormattedDescription,
      )

      const effectiveType = modalTransaction?.internalType ?? modalTransaction?.type
      const saleNotes =
        effectiveType === "INCOME"
          ? sanitizeIncomeNoteValue(modalSaleDetails.notes)
          : ""

      const processedBaseEntries =
        effectiveType === "INCOME"
          ? baseEntries
              .map((entry) => {
                const sanitizedValue = sanitizeIncomeNoteValue(entry.value)
                if (!sanitizedValue) {
                  return null
                }

                return {
                  ...entry,
                  value: sanitizedValue,
                }
              })
              .filter((entry): entry is StructuredNoteEntry => entry !== null)
          : baseEntries

      if (!saleNotes) {
        return processedBaseEntries
      }

      const normalizedSaleNote = normalizeWhitespace(collapseRepeatedPhrase(saleNotes))
      if (!normalizedSaleNote) {
        return processedBaseEntries
      }

      const alreadyIncluded = processedBaseEntries.some(
        (entry) => entry.value.toLowerCase() === normalizedSaleNote.toLowerCase(),
      )

      if (alreadyIncluded) {
        return processedBaseEntries
      }

      const label = processedBaseEntries.length > 0 ? "Notas adicionales" : "Notas"
      return [
        ...processedBaseEntries,
        {
          label,
          value: normalizedSaleNote,
        },
      ]
    }, [
      modalFormattedDescription,
      modalSaleDetails.notes,
      modalTransaction?.description,
      modalTransaction?.internalType,
      modalTransaction?.type,
    ])

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por encargado, nota, ID, monto o método de pago..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[110px] sm:w-[130px] w-full justify-between">
                {typeFilter ? typeLabels[typeFilter] : "Todos"}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTypeFilter(null)}>Todos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("INCOME")}>Ingresos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("EXPENSE")}>Retiros</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("CLOSURE")}>Cierres</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[110px] sm:w-[130px] w-full justify-between">
                  {selectedDate ? format(selectedDate, "PP") : "Fecha"}
                  <Calendar className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && onDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" onClick={clearFilters} size="sm">
              Limpiar
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto sm:overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("timestamp")}>
                  <div className="flex items-center">
                    Fecha/Hora
                    {sortConfig.key === "timestamp" &&
                      (sortConfig.direction === "ascending" ? (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("amount")}> 
                  <div className="flex items-center">
                    Monto
                    {sortConfig.key === "amount" &&
                      (sortConfig.direction === "ascending" ? (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
                {!isMobile && <TableHead>Comprobante</TableHead>}
                {!isMobile && <TableHead>Cliente</TableHead>}
                {!isMobile && <TableHead className="cursor-pointer" onClick={() => handleSort("employee")}> 
                  <div className="flex items-center">
                    Encargado
                    {sortConfig.key === "employee" &&
                      (sortConfig.direction === "ascending" ? (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      ))}
                  </div>
                </TableHead>}
                {!isMobile &&<TableHead>Métodos de Pago</TableHead>}
                {!isMobile && <TableHead>Notas</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.length > 0 ? (
                sortedTransactions.map((transaction) => {
                  const formattedDescription = formatSaleDescription(transaction.description)
                  const currencySymbol = (transaction.currency ?? "S/.").trim() || "S/."
                  const effectiveType = transaction.internalType ?? transaction.type
                  const signedAmount = formatAmountWithSign(
                    transaction.amount,
                    effectiveType,
                    currencySymbol,
                  )
                  const paymentEntriesForDisplay = Array.isArray(transaction.paymentMethods)
                    ? transaction.paymentMethods.map((method) => ({
                        ...splitPaymentMethodEntry(method),
                        raw: method,
                      }))
                    : []
                  const closureDetails =
                    (transaction.internalType ?? transaction.type) === "CLOSURE"
                      ? closureDetailsMap.get(transaction.id)
                      : undefined

                  return (
                    <Tooltip key={transaction.id}>
                      <TooltipTrigger asChild>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => setModalTransaction(transaction)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.type)}
                              {getTransactionBadge(transaction.type)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[100px] truncate whitespace-nowrap overflow-hidden">
                            {new Date(transaction.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {signedAmount}
                          </TableCell>
                        {!isMobile && <TableCell>{transaction.voucher || "-"}</TableCell>}
                          {!isMobile && (
                            <TableCell className="max-w-[200px] truncate">
                              {transaction.clientName
                                ? `${transaction.clientName}${transaction.clientDocumentType && transaction.clientDocument ? ` (${transaction.clientDocumentType} ${transaction.clientDocument})` : ""}`
                                : "-"}
                            </TableCell>
                          )}
                          {!isMobile && <TableCell>{transaction.employee}</TableCell>}
                          {!isMobile && (
                            <TableCell className="flex flex-wrap gap-1">
                              {paymentEntriesForDisplay.length > 0 ? (
                                paymentEntriesForDisplay.map((entry, index) => {
                                  const label = entry.label || entry.raw
                                  const amountText = entry.amountText
                                    ? formatPaymentAmountText(
                                        entry.amountText,
                                        effectiveType === "EXPENSE",
                                      )
                                    : null

                                  return (
                                    <Badge
                                      key={`${entry.raw}-${index}`}
                                      variant="outline"
                                      className={getBadgeColor(label || entry.raw)}
                                    >
                                      {amountText ? (
                                        <>
                                          <span>{label}</span>
                                          <span className="ml-1 font-semibold">{amountText}</span>
                                        </>
                                      ) : (
                                        <span>{label}</span>
                                      )}
                                    </Badge>
                                  )
                                })
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          )}
                          {!isMobile && (
                            <TableCell className="max-w-[200px] truncate">
                              {formattedDescription || transaction.description || "-"}
                            </TableCell>
                          )}
                        </TableRow>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="w-[340px] space-y-4 rounded-lg border bg-background p-4 text-left shadow-lg sm:w-[380px]"
                      >
                        {(() => {
                          const effectiveType = transaction.internalType ?? transaction.type
                          const isClosure = effectiveType === "CLOSURE"
                          const documentParts = [
                            transaction.clientDocumentType ?? "",
                            transaction.clientDocument ?? "",
                          ]
                            .map((value) => (value ?? "").trim())
                            .filter((value) => value.length > 0)

                          const {
                            items: saleItems,
                            notes: rawSaleNotes,
                          } = parseSaleItemsFromDescription(transaction.description)
                          const paymentMethods = Array.isArray(transaction.paymentMethods)
                            ? transaction.paymentMethods
                            : []
                          const paymentEntries = paymentMethods.map((method) => ({
                            ...splitPaymentMethodEntry(method),
                            raw: method,
                          }))
                          const saleNotes =
                            effectiveType === "INCOME"
                              ? sanitizeIncomeNoteValue(rawSaleNotes)
                              : rawSaleNotes ?? ""
                          const baseTransactionNotes = transaction.notes ?? ""
                          const transactionNotes =
                            effectiveType === "INCOME"
                              ? sanitizeIncomeNoteValue(baseTransactionNotes)
                              : baseTransactionNotes
                          const itemsTotal = saleItems.reduce((sum, item) => sum + item.total, 0)
                          const rawNoteCandidates = isClosure
                            ? [transactionNotes, saleNotes, formattedDescription ?? ""]
                            : [saleNotes, transactionNotes, formattedDescription ?? ""]

                          const notesContent = rawNoteCandidates
                            .map((value) => collapseRepeatedPhrase(value ?? ""))
                            .map((value) => normalizeWhitespace(value))
                            .filter((value) => value.length > 0)
                            .filter(
                              (value, index, array) =>
                                array.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index,
                            )
                            .join("\n")

                          const closedOpeningBalanceAmount =
                            transaction.openingBalance !== null && transaction.openingBalance !== undefined
                              ? Number(transaction.openingBalance) || 0
                              : null
                          
                          const nextOpeningBalanceAmount =
                            transaction.nextOpeningBalance !== null &&
                            transaction.nextOpeningBalance !== undefined
                              ? Number(transaction.nextOpeningBalance) || 0
                              : null    

                          const totalOperationsAmount =
                            (closureDetails?.paymentBreakdown?.reduce(
                              (sum, entry) => sum + entry.amount,
                              0,
                            ) ?? 0) + (closedOpeningBalanceAmount ?? 0)

                          return (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Resumen de la operación
                                </p>
                              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm leading-5">
                                  <dt className="text-muted-foreground">Tipo</dt>
                                  <dd className="font-medium text-foreground">
                                    {typeLabels[transaction.type] ?? transaction.type}
                                  </dd>
                                  <dt className="text-muted-foreground">Fecha y hora</dt>
                                  <dd className="font-medium text-foreground">
                                    {new Date(transaction.timestamp).toLocaleString()}
                                  </dd>
                                  <dt className="text-muted-foreground">Encargado</dt>
                                  <dd className="font-medium text-foreground">{transaction.employee || "-"}</dd>
                                  {(transaction.clientName || documentParts.length > 0) && (
                                    <>
                                      <dt className="text-muted-foreground">Cliente</dt>
                                      <dd className="font-medium text-foreground">
                                        {transaction.clientName || "Sin cliente"}
                                        {documentParts.length > 0 ? ` (${documentParts.join(" ")})` : ""}
                                      </dd>
                                    </>
                                  )}
                                  <dt className="text-muted-foreground">Monto</dt>
                                  <dd className="font-semibold text-foreground">
                                    {formatAmountWithSign(transaction.amount, effectiveType, currencySymbol)}
                                  </dd>
                                  {transaction.voucher && (
                                    <>
                                      <dt className="text-muted-foreground">Comprobante</dt>
                                      <dd className="font-medium text-foreground">{transaction.voucher}</dd>
                                    </>
                                  )}
                                </dl>
                              </div>

                              {paymentEntries.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Métodos de pago
                                  </p>
                                  <div className="space-y-1">
                                    {paymentEntries.map((entry, index) => {
                                      const amountText = entry.amountText
                                        ? formatPaymentAmountText(
                                            entry.amountText,
                                            effectiveType === "EXPENSE",
                                          )
                                        : null

                                      return (
                                        <div
                                          key={`${entry.label}-${index}`}
                                          className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
                                        >
                                          <span className="font-medium text-foreground">
                                            {entry.label || entry.raw}
                                          </span>
                                          {amountText && (
                                            <span className="text-muted-foreground">{amountText}</span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {!isClosure && saleItems.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Detalle de productos
                                  </p>
                                  <div className="overflow-hidden rounded-md border">
                                    <table className="w-full text-xs">
                                      <thead className="bg-muted/60 text-muted-foreground">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium">Producto</th>
                                          <th className="px-3 py-2 text-center font-medium">Cantidad</th>
                                          <th className="px-3 py-2 text-center font-medium">Precio unit.</th>
                                          <th className="px-3 py-2 text-right font-medium">Importe</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {saleItems.map((item, index) => (
                                          <tr key={`${item.name}-${index}`} className="border-t">
                                            <td className="px-3 py-2 font-medium text-foreground">{item.name}</td>
                                            <td className="px-3 py-2 text-center text-muted-foreground">
                                              {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2 text-center text-muted-foreground">
                                              {formatCurrency(item.unitPrice, currencySymbol)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium text-foreground">
                                              {formatCurrency(item.total, currencySymbol)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm font-semibold text-muted-foreground">
                                    <span>Total productos</span>
                                    <span>{formatCurrency(itemsTotal, currencySymbol)}</span>
                                  </div>
                                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm font-semibold text-muted-foreground">
                                    <span>Total operación</span>
                                    <span className="font-semibold text-foreground">
                                      {formatAmountWithSign(transaction.amount, effectiveType, currencySymbol)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {isClosure && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Detalle del cierre
                                  </p>
                                  <div className="space-y-1 text-sm">
                                    {nextOpeningBalanceAmount !== null && (
                                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                                        <span className="text-muted-foreground">Saldo inicial apertura nueva caja</span>
                                        <span className="font-medium text-foreground">
                                          {formatCurrency(nextOpeningBalanceAmount, currencySymbol)}
                                        </span>
                                      </div>
                                    )}
                                    {closedOpeningBalanceAmount !== null && (
                                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                                        <span className="text-muted-foreground">Saldo Inicial con el que la caja cerrada inició</span>
                                        <span className="font-medium text-foreground">
                                          {formatCurrency(closedOpeningBalanceAmount, currencySymbol)}
                                        </span>
                                      </div>
                                    )}
                                    {closureDetails &&
                                      (closureDetails.paymentBreakdown.length > 0 || closedOpeningBalanceAmount !== null) && (
                                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                                        <span className="text-muted-foreground">Todas las operaciones(Incluido Saldo Inicial)</span>
                                        <span className="font-medium text-foreground">
                                          {formatCurrency(totalOperationsAmount, currencySymbol)}
                                        </span>
                                      </div>
                                    )}
                                    {transaction.closingBalance !== null && transaction.closingBalance !== undefined && (
                                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                                        <span className="text-muted-foreground">Efectivo contado</span>
                                        <span className="font-medium text-foreground">
                                          {formatCurrency(Number(transaction.closingBalance), currencySymbol)}
                                        </span>
                                      </div>
                                    )}
                                    {closureDetails && (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                          <span className="text-muted-foreground">Operaciones hasta el cierre</span>
                                          <span className="font-medium text-foreground">
                                            {closureDetails.operationsCount}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                          <span className="text-muted-foreground">Total movimientos</span>
                                          <span className="font-medium text-foreground">
                                            {formatCurrency(closureDetails.totalAmount, currencySymbol)}
                                          </span>
                                        </div>
                                        {closureDetails.paymentBreakdown.length > 0 && (
                                          <div className="rounded-md border">
                                            <table className="w-full text-xs">
                                              <tbody>
                                                {closureDetails.paymentBreakdown.map((entry) => (
                                                  <tr key={entry.method} className="border-t">
                                                    <td className="px-3 py-2 text-left text-muted-foreground">{entry.method}</td>
                                                    <td className="px-3 py-2 text-right font-medium text-foreground">
                                                      {formatCurrency(entry.amount, currencySymbol)}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {notesContent && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Notas y observaciones
                                  </p>
                                  <div className="whitespace-pre-line rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                    {notesContent}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}                   
                      </TooltipContent>
                    </Tooltip>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No se encontraron transacciones.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {(hasActiveOperations || closureSummaries.length > 0) && (
            <div className="border-t px-4 py-4 text-sm sm:px-6">
              <div className="space-y-4">
                {hasActiveOperations && activeOperationsSummary && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        Operaciones desde el último cierre
                      </p>
                      <span className="text-xs text-muted-foreground">
                        Caja abierta actualmente
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                        <span className="text-muted-foreground">Operaciones registradas</span>
                        <span className="font-medium text-foreground">
                          {activeOperationsSummary.operationsCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                        <span className="text-muted-foreground">Total de operaciones (todos los métodos)</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(
                            activeOperationsSummary.totalByPaymentMethods,
                            activeOperationsSummary.currencySymbol,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                        <span className="text-muted-foreground">Total de operaciones en efectivo</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(
                            activeOperationsSummary.cashTotal,
                            activeOperationsSummary.currencySymbol,
                          )}
                        </span>
                      </div>
                      {activeOperationsSummary.paymentBreakdown.length > 0 && (
                        <div className="rounded-md border bg-background/80">
                          <table className="w-full text-xs">
                            <tbody>
                              {activeOperationsSummary.paymentBreakdown.map((entry) => (
                                <tr key={entry.method} className="border-t">
                                  <td className="px-3 py-2 text-left text-muted-foreground">{entry.method}</td>
                                  <td className="px-3 py-2 text-right font-medium text-foreground">
                                    {formatCurrency(entry.amount, activeOperationsSummary.currencySymbol)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {closureSummaries.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Resumen de cierres</p>
                      <p className="text-xs text-muted-foreground">
                        Cada cierre muestra el acumulado de movimientos antes del conteo de efectivo.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {closureSummaries.map((summary) => {
                        const operationsWithItems = summary.operations.filter(
                          (operation) => operation.saleItems.length > 0,
                        )

                        return (
                          <div key={summary.id} className="rounded-md border bg-muted/20 p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-sm font-semibold text-foreground">
                                Cierre de caja · {format(summary.timestamp, "dd/MM/yyyy HH:mm:ss")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Responsable: {summary.employee}
                              </span>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                <span className="text-muted-foreground">Operaciones registradas</span>
                                <span className="font-medium text-foreground">{summary.operationsCount}</span>
                              </div>
                              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                <span className="text-muted-foreground">Total de operaciones (todos los métodos)</span>
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(summary.totalByPaymentMethods, summary.currencySymbol)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                <span className="text-muted-foreground">Total de operaciones en efectivo</span>
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(summary.cashTotal, summary.currencySymbol)}
                                </span>
                              </div>
                              {summary.closingBalance !== null && (
                                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                  <span className="text-muted-foreground">Efectivo contado en cierre</span>
                                  <span className="font-semibold text-foreground">
                                    {formatCurrency(Number(summary.closingBalance), summary.currencySymbol)}
                                  </span>
                                </div>
                              )}
                              {summary.openingBalance !== null && (
                                <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                  <span className="text-muted-foreground">Saldo inicial del turno</span>
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(Number(summary.openingBalance), summary.currencySymbol)}
                                  </span>
                                </div>
                              )}
                            </div>
                            {summary.paymentBreakdown.length > 0 && (
                              <div className="mt-3 rounded-md border bg-background/80">
                                <table className="w-full text-xs">
                                  <tbody>
                                    {summary.paymentBreakdown.map((entry) => (
                                      <tr key={entry.method} className="border-t">
                                        <td className="px-3 py-2 text-left text-muted-foreground">{entry.method}</td>
                                        <td className="px-3 py-2 text-right font-medium text-foreground">
                                          {formatCurrency(entry.amount, summary.currencySymbol)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          {operationsWithItems.length > 0 && (
                              <div className="mt-4 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Operaciones con detalle de productos
                                </p>
                                <div className="space-y-3">
                                  {operationsWithItems.map((operation) => (
                                    <div
                                      key={operation.id}
                                      className="rounded-md border bg-background px-3 py-3 shadow-sm"
                                    >
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium text-foreground">
                                            {operation.description}
                                          </p>
                                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                            {operation.timestamp && (
                                              <span>{format(operation.timestamp, "dd/MM/yyyy HH:mm")}</span>
                                            )}
                                            <span>#{operation.id}</span>
                                            <span>{operation.employee}</span>
                                          </div>
                                          {(operation.clientName || operation.clientDocument) && (
                                            <p className="text-xs text-muted-foreground">
                                              Cliente: {operation.clientName ?? "Sin cliente"}
                                              {operation.clientDocument
                                                ? ` (${operation.clientDocument})`
                                                : ""}
                                            </p>
                                          )}
                                          {operation.voucher && (
                                            <p className="text-xs text-muted-foreground">
                                              Comprobante: {operation.voucher}
                                            </p>
                                          )}
                                        </div>
                                        <span className="text-sm font-semibold text-foreground">
                                          {formatAmountWithSign(
                                            operation.amount,
                                            operation.type,
                                            operation.currencySymbol,
                                          )}
                                        </span>
                                      </div>
                                      {operation.paymentMethods.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {operation.paymentMethods.map((method, index) => {
                                            const amountText = method.amountText
                                              ? formatPaymentAmountText(
                                                  method.amountText,
                                                  operation.type === "EXPENSE",
                                                )
                                              : null

                                            return (
                                              <div
                                                key={`${operation.id}-method-${index}`}
                                                className="flex items-center justify-between rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs"
                                              >
                                                <span className="font-medium text-foreground">
                                                  {method.label || method.raw}
                                                </span>
                                                {amountText && (
                                                  <span className="text-muted-foreground">{amountText}</span>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                      <div className="mt-3 overflow-hidden rounded-md border bg-muted/20">
                                        <table className="w-full text-xs">
                                          <tbody>
                                            {operation.saleItems.map((item, index) => (
                                              <tr
                                                key={`${operation.id}-item-${index}`}
                                                className={index !== 0 ? "border-t" : undefined}
                                              >
                                                <td className="px-3 py-1.5 text-left text-foreground">
                                                  <span className="font-medium">{item.quantity}×</span>{" "}
                                                  {item.name}
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-muted-foreground">
                                                  {formatCurrency(item.total, operation.currencySymbol)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                      {operation.notes && (
                                        <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">
                                          {operation.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {summary.notes && (
                              <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">
                                {summary.notes}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal solo en móviles */}
          <Dialog open={!!modalTransaction} onOpenChange={() => setModalTransaction(null)}>
            <DialogContent
              className="max-h-[85vh] overflow-y-auto sm:max-w-3xl lg:max-w-4xl"
            >
              <DialogHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <DialogTitle className="text-base font-semibold sm:text-lg">
                    Detalle de Transacción
                  </DialogTitle>
                </div>
              </DialogHeader>
              {modalTransaction && (
                <div className="space-y-4 text-sm sm:text-base">
                  {(() => {
                    const modalEffectiveType = modalTransaction.internalType ?? modalTransaction.type
                    const paymentEntries = Array.isArray(modalTransaction.paymentMethods)
                      ? modalTransaction.paymentMethods.map((method) => ({
                          ...splitPaymentMethodEntry(method),
                          raw: method,
                        }))
                      : []
                    const formattedPaymentMethods = paymentEntries.length > 0
                      ? paymentEntries
                          .map((entry) => {
                            if (!entry.amountText) {
                              return entry.label || entry.raw
                            }

                            const amountText = formatPaymentAmountText(
                              entry.amountText,
                              modalEffectiveType === "EXPENSE",
                            )

                            return `${entry.label || entry.raw}: ${amountText}`
                          })
                          .join(", ")
                      : "-"

                    const formattedAmount = formatAmountWithSign(
                      modalTransaction.amount,
                      modalEffectiveType,
                      modalCurrency,
                    )

                    const saleDetails =
                      modalEffectiveType === "INCOME"
                        ? modalSaleDetails
                        : { items: [] as SaleDetailItem[], notes: "" }
                    const saleItems = saleDetails.items
                    const saleItemsTotal = saleItems.reduce(
                      (sum, item) => sum + item.total,
                      0,
                    )
                    const saleNotes =
                      modalEffectiveType === "INCOME"
                        ? normalizeWhitespace(saleDetails.notes)
                        : ""

                    const paymentEntriesForModal = paymentEntries.map((entry) => ({
                      label: entry.label || entry.raw,
                      amountText: entry.amountText
                        ? formatPaymentAmountText(
                            entry.amountText,
                            modalEffectiveType === "EXPENSE",
                          )
                        : null,
                    }))

                    return (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <p><strong>Tipo:</strong> {typeLabels[modalTransaction.type] ?? modalTransaction.type}</p>
                        <p><strong>Fecha/Hora:</strong> {new Date(modalTransaction.timestamp).toLocaleString()}</p>
                        <p><strong>Monto:</strong> {formattedAmount}</p>
                        <p><strong>Encargado:</strong> {modalTransaction.employee || "-"}</p>
                        <p>
                          <strong>Métodos de Pago:</strong> {formattedPaymentMethods}
                        </p>
                        <p><strong>ID:</strong> {modalTransaction.id}</p>
                        {(modalTransaction.cashRegisterName || modalTransaction.cashRegisterId) && (
                          <p>
                            <strong>Caja:</strong> {modalTransaction.cashRegisterName ?? "Caja"}
                            {modalTransaction.cashRegisterId ? ` (#${modalTransaction.cashRegisterId})` : ""}
                          </p>
                        )}
                      {modalTransaction.clientName && (
                          <p><strong>Cliente:</strong> {modalTransaction.clientName}</p>
                        )}
                        {modalTransaction.clientDocument && modalTransaction.clientDocumentType && (
                          <p>
                            <strong>Documento:</strong> {modalTransaction.clientDocumentType} {modalTransaction.clientDocument}
                          </p>
                        )}
                        {modalTransaction.status && (
                          <p><strong>Estado:</strong> {modalTransaction.status}</p>
                        )}
                        {modalTransaction.expectedAmount !== undefined && (
                          <p>
                            <strong>Monto esperado:</strong> {modalCurrency} {Number(modalTransaction.expectedAmount).toFixed(2)}
                          </p>
                        )}
                        {modalTransaction.discrepancy !== undefined && (
                          <p>
                            <strong>Diferencia:</strong> {modalCurrency} {Number(modalTransaction.discrepancy).toFixed(2)}
                          </p>
                        )}
                        {modalTransaction.voucher && (
                          <p>
                            <strong>Comprobante:</strong> {modalTransaction.voucher}
                          </p>
                        )}
                        {modalTransaction.invoiceUrl && (
                          <p>
                            <strong>Enlace del comprobante:</strong>{" "}
                            <a
                              href={modalTransaction.invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              Ver comprobante
                            </a>
                          </p>
                        )}
                        {modalInvoiceUrl && (
                          <p>
                            <strong>PDF Sunat:</strong>{" "}
                            <a
                              href={modalInvoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              Descargar comprobante
                            </a>
                          </p>
                        )}
                        {modalEffectiveType === "INCOME" && (
                          <div className="sm:col-span-2 mt-2 space-y-3">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Detalle de productos
                              </p>
                              {saleItems.length > 0 ? (
                                <div className="overflow-x-auto rounded-md border">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted/40">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium">Producto</th>
                                        <th className="px-3 py-2 text-center font-medium">Cantidad</th>
                                        <th className="px-3 py-2 text-right font-medium">Precio unitario</th>
                                        <th className="px-3 py-2 text-right font-medium">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {saleItems.map((item, index) => (
                                        <tr key={`${item.name}-${index}`} className="border-t">
                                          <td className="px-3 py-2 align-middle text-muted-foreground">
                                            {item.name}
                                          </td>
                                          <td className="px-3 py-2 text-center align-middle text-muted-foreground">
                                            {item.quantity}
                                          </td>
                                          <td className="px-3 py-2 text-right align-middle text-muted-foreground">
                                            {formatCurrency(item.unitPrice, modalCurrency)}
                                          </td>
                                          <td className="px-3 py-2 text-right align-middle font-semibold">
                                            {formatCurrency(item.total, modalCurrency)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t bg-muted/30">
                                        <th
                                          colSpan={3}
                                          className="px-3 py-2 text-right font-semibold"
                                        >
                                          Total productos
                                        </th>
                                        <td className="px-3 py-2 text-right font-semibold">
                                          {formatCurrency(saleItemsTotal, modalCurrency)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No se encontraron productos asociados a esta venta.
                                </p>
                              )}
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Métodos de pago utilizados
                              </p>
                              {paymentEntriesForModal.length > 0 ? (
                                <div className="overflow-hidden rounded-md border">
                                  <table className="w-full text-sm">
                                    <tbody>
                                      {paymentEntriesForModal.map((entry, index) => (
                                        <tr key={`${entry.label}-${index}`} className="border-b last:border-b-0">
                                          <th className="w-1/2 bg-muted px-3 py-2 text-left font-medium align-top">
                                            {entry.label}
                                          </th>
                                          <td className="px-3 py-2 text-right text-muted-foreground">
                                            {entry.amountText ?? "-"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Sin métodos de pago registrados.</p>
                              )}
                            </div>

                            {saleNotes && (
                              <p className="text-sm text-muted-foreground">{saleNotes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  {modalClosureDetails && (
                    <div className="space-y-3">
                      <div>
                        <p className="font-semibold">Detalle del cierre</p>
                        <div className="overflow-hidden rounded-md border">
                          <table className="w-full text-sm">
                            <tbody>
                              {[
                                {
                                  label: "Detalle",
                                  value:
                                    collapseRepeatedPhrase(
                                      formatSaleDescription(modalTransaction.description) ||
                                        modalTransaction.description ||
                                        "Cierre de caja",
                                    ) || "Cierre de caja",
                                },
                                {
                                  label: "Saldo inicial apertura nueva caja",
                                  value:
                                    modalTransaction.nextOpeningBalance !== null && modalTransaction.nextOpeningBalance !== undefined
                                      ? `${modalCurrency} ${Number(modalTransaction.nextOpeningBalance).toFixed(2)}`
                                      : "-",
                                },
                                {
                                  label: "Saldo Inicial con el que la caja cerrada inició",
                                  value:
                                    modalTransaction.openingBalance !== null && modalTransaction.openingBalance !== undefined
                                      ? `${modalCurrency} ${Number(modalTransaction.openingBalance).toFixed(2)}`
                                      : "-",
                                },
                                {
                                  label: "Ingresos acumulados",
                                  value:
                                    modalTransaction.totalIncome !== null && modalTransaction.totalIncome !== undefined
                                      ? `${modalCurrency} ${Number(modalTransaction.totalIncome).toFixed(2)}`
                                      : "-",
                                },
                                {
                                  label: "Retiros acumulados",
                                  value:
                                    modalTransaction.totalExpense !== null && modalTransaction.totalExpense !== undefined
                                      ? `${modalCurrency} ${Number(modalTransaction.totalExpense).toFixed(2)}`
                                      : "-",
                                },
                                {
                                  label: "Operaciones registradas",
                                  value: String(modalClosureDetails.operationsCount),
                                },
                                {
                                  label: "Total de movimientos",
                                  value: `${modalCurrency} ${modalClosureDetails.totalAmount.toFixed(2)}`,
                                },
                                {
                                  label: "Efectivo contabilizado",
                                  value:
                                    modalTransaction.closingBalance !== null && modalTransaction.closingBalance !== undefined
                                      ? `${modalCurrency} ${Number(modalTransaction.closingBalance).toFixed(2)}`
                                      : `${modalCurrency} ${modalTransaction.amount.toFixed(2)}`,
                                },
                              ].map((row) => (
                                <tr key={row.label} className="border-b last:border-b-0">
                                  <th className="bg-muted px-3 py-2 text-left font-medium align-top w-48">{row.label}</th>
                                  <td className="px-3 py-2 text-muted-foreground">{row.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {modalClosureDetails.paymentBreakdown.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-semibold">Totales por método de pago</p>
                          <div className="overflow-hidden rounded-md border">
                            <table className="w-full text-sm">
                              <tbody>
                                {modalClosureDetails.paymentBreakdown.map((entry) => (
                                  <tr key={entry.method} className="border-b last:border-b-0">
                                    <th className="bg-muted px-3 py-2 text-left font-medium align-top w-48">{entry.method}</th>
                                    <td className="px-3 py-2 text-muted-foreground">
                                      {modalCurrency} {entry.amount.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* La sección de notas permanece montada pero oculta visualmente para evitar mostrarla en el modal. */}
                  <div className="hidden" aria-hidden>
                    <div className="space-y-2">
                      <p className="font-semibold">Notas</p>
                      {(() => {
                        const extraNotes: StructuredNoteEntry[] = []
                        const trimmedNote = modalTransaction?.notes?.trim()
                        if (trimmedNote) {
                          const collapsedNote = collapseRepeatedPhrase(trimmedNote)
                          const normalizedNote = normalizeWhitespace(collapsedNote)
                          if (normalizedNote) {
                            const alreadyIncluded = structuredNotes.some(
                              (entry) => entry.value.toLowerCase() === normalizedNote.toLowerCase(),
                            )
                            if (!alreadyIncluded) {
                              extraNotes.push({
                                label: structuredNotes.length > 0 ? "Observaciones" : "Notas",
                                value: normalizedNote,
                              })
                            }
                          }
                        }
                      const combined = [...structuredNotes, ...extraNotes]
                        if (combined.length === 0) {
                          return <p className="text-muted-foreground">No hay notas adicionales.</p>
                        }
                        return (
                          <div className="overflow-hidden rounded-md border">
                            <table className="w-full text-sm">
                              <tbody>
                                {combined.map((entry, index) => (
                                  <tr key={`${entry.label}-${index}`} className="border-b last:border-b-0">
                                    <th className="bg-muted px-3 py-2 text-left font-medium align-top w-36">{entry.label}</th>
                                    <td className="px-3 py-2 text-muted-foreground">{entry.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }
