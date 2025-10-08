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

    entries.push({
      label: toSentenceCase(rawLabel),
      value: rawValue || "-",
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
      value: toSentenceCase(sentence),
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

    const closureDetailsMap = useMemo(() => {
      const details = new Map<string, ClosureMetrics>()
      const sortedTransactions = [...transactions].sort((a, b) => {
        const aTime = getTransactionDate(a.timestamp)?.getTime() ?? 0
        const bTime = getTransactionDate(b.timestamp)?.getTime() ?? 0
        return aTime - bTime
      })

      let operationsCount = 0
      let totalAmount = 0
      let paymentAggregates = new Map<string, number>()

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
          })

          operationsCount = 0
          totalAmount = 0
          paymentAggregates = new Map<string, number>()
          return
        }

        if (entryType !== "INCOME" && entryType !== "EXPENSE") {
          return
        }

        operationsCount += 1
        const rawAmount = Number(transaction.amount ?? 0)
        const signedAmount = entryType === "EXPENSE" ? -rawAmount : rawAmount
        totalAmount += signedAmount

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

      return details
    }, [transactions])

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    const modalFormattedDescription = modalTransaction ? formatSaleDescription(modalTransaction.description) : ""
    const modalInvoiceUrl = modalTransaction ? getInvoiceUrl(modalTransaction) : null
    const modalCurrency = modalTransaction ? (modalTransaction.currency ?? "S/.").trim() || "S/." : "S/."
    const modalClosureDetails =
      modalTransaction && (modalTransaction.internalType ?? modalTransaction.type) === "CLOSURE"
        ? closureDetailsMap.get(modalTransaction.id)
        : undefined
    const structuredNotes = useMemo(
      () => parseStructuredNotes(modalTransaction?.description, modalFormattedDescription),
      [modalTransaction?.description, modalFormattedDescription],
    )

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
                            {currencySymbol} {transaction.amount.toFixed(2)}
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
                              {transaction.paymentMethods && transaction.paymentMethods.length > 0 ? (
                                transaction.paymentMethods.map((method, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className={getBadgeColor(method)}
                                  >
                                    {method}
                                  </Badge>
                                ))
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
                          const isClosure = (transaction.internalType ?? transaction.type) === "CLOSURE"
                          const documentParts = [
                            transaction.clientDocumentType ?? "",
                            transaction.clientDocument ?? "",
                          ]
                            .map((value) => (value ?? "").trim())
                            .filter((value) => value.length > 0)

                          const { items: saleItems, notes: saleNotes } = parseSaleItemsFromDescription(
                            transaction.description,
                          )
                          const paymentMethods = Array.isArray(transaction.paymentMethods)
                            ? transaction.paymentMethods
                            : []
                          const paymentEntries = paymentMethods.map(splitPaymentMethodEntry)
                          const itemsTotal = saleItems.reduce((sum, item) => sum + item.total, 0)
                          const fallbackNotes = [
                            saleNotes,
                            transaction.notes ?? "",
                            formattedDescription ?? "",
                          ]
                            .map((value) => (value ?? "").trim())
                            .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index)
                          const notesContent = fallbackNotes.join("\n")

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
                                    {formatCurrency(transaction.amount, currencySymbol)}
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
                                    {paymentEntries.map((entry, index) => (
                                      <div
                                        key={`${entry.label}-${index}`}
                                        className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm"
                                      >
                                        <span className="font-medium text-foreground">{entry.label}</span>
                                        {entry.amountText && (
                                          <span className="text-muted-foreground">{entry.amountText}</span>
                                        )}
                                      </div>
                                    ))}
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
                                      {formatCurrency(transaction.amount, currencySymbol)}
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
                                    {transaction.openingBalance !== null && transaction.openingBalance !== undefined && (
                                      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                                        <span className="text-muted-foreground">Saldo inicial</span>
                                        <span className="font-medium text-foreground">
                                          {formatCurrency(Number(transaction.openingBalance), currencySymbol)}
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p><strong>Tipo:</strong> {typeLabels[modalTransaction.type] ?? modalTransaction.type}</p>
                    <p><strong>Fecha/Hora:</strong> {new Date(modalTransaction.timestamp).toLocaleString()}</p>
                    <p><strong>Monto:</strong> {modalCurrency} {modalTransaction.amount.toFixed(2)}</p>
                    <p><strong>Encargado:</strong> {modalTransaction.employee || "-"}</p>
                    <p>
                      <strong>Métodos de Pago:</strong> {modalTransaction.paymentMethods?.length
                        ? modalTransaction.paymentMethods.join(", ")
                        : "-"}
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
                        <strong>Comprobante:</strong>{" "}
                        {modalInvoiceUrl ? (
                          <a
                            href={modalInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            {modalTransaction.voucher}
                          </a>
                        ) : (
                          modalTransaction.voucher
                        )}
                      </p>
                    )}
                  </div>
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
                                  value: formatSaleDescription(modalTransaction.description) || modalTransaction.description || "Cierre de caja",
                                },
                                {
                                  label: "Saldo inicial",
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
                  <div className="space-y-2">
                    <p className="font-semibold">Notas</p>
                    {(() => {
                      const extraNotes: StructuredNoteEntry[] = []
                      const trimmedNote = modalTransaction.notes?.trim()
                      if (trimmedNote) {
                        const alreadyIncluded = structuredNotes.some((entry) => entry.value === trimmedNote)
                        if (!alreadyIncluded) {
                          extraNotes.push({
                            label: structuredNotes.length > 0 ? "Observaciones" : "Notas",
                            value: trimmedNote,
                          })
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
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }
