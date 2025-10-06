"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Calculator, Search, ChevronDown, ChevronUp, Calendar } from "lucide-react"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

  interface TransactionHistoryProps {
    transactions: Transaction[]
    selectedDate: Date
    onDateChange: (date: Date) => void
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

    const parseTransactionDate = (value: Transaction["timestamp"]) => {
      if (!value) return null

      const parsedDate = value instanceof Date ? value : new Date(value)
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
    }

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

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    const modalFormattedDescription = modalTransaction ? formatSaleDescription(modalTransaction.description) : ""
    const modalInvoiceUrl = modalTransaction ? getInvoiceUrl(modalTransaction) : null
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
                {!isMobile && <TableHead>Encargado</TableHead>}
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
                            {(transaction.currency ?? "S/.")} {transaction.amount.toFixed(2)}
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
                      <TooltipContent side="top" className="max-w-xs space-y-1 text-left">
                        <p>
                          <span className="font-medium">Encargado:</span> {transaction.employee || "-"}
                        </p>
                        {transaction.clientName && (
                          <p>
                            <span className="font-medium">Cliente:</span> {transaction.clientName}
                          </p>
                        )}
                        {transaction.clientDocument && transaction.clientDocumentType && (
                          <p>
                            <span className="font-medium">Documento:</span> {transaction.clientDocumentType} {transaction.clientDocument}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Monto:</span> {(transaction.currency ?? "S/.")} {transaction.amount.toFixed(2)}
                        </p>
                        {transaction.paymentMethods && transaction.paymentMethods.length > 0 && (
                          <p>
                            <span className="font-medium">Metodos de pago:</span> {transaction.paymentMethods.join(" | ")}
                          </p>
                        )}
                        {formattedDescription && (
                          <p>
                            <span className="font-medium">Notas:</span> {formattedDescription}
                          </p>
                        )}
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detalle de Transacción</DialogTitle>
              </DialogHeader>
              {modalTransaction && (
                <div className="space-y-2 text-sm">
                  <p><strong>Tipo:</strong> {typeLabels[modalTransaction.type]}</p>
                  <p><strong>Fecha/Hora:</strong> {new Date(modalTransaction.timestamp).toLocaleString()}</p>
                  <p><strong>Monto:</strong> S/. {modalTransaction.amount.toFixed(2)}</p>
                  <p><strong>Encargado:</strong> {modalTransaction.employee}</p>
                  <p><strong>Métodos de Pago:</strong> {modalTransaction.paymentMethods?.join(", ") || "-"}</p>
                  <div className="space-y-2">
                    <p className="font-semibold">Notas</p>
                    {structuredNotes.length > 0 ? (
                      <div className="overflow-hidden rounded-md border">
                        <table className="w-full text-sm">
                          <tbody>
                            {structuredNotes.map((entry, index) => (
                              <tr key={`${entry.label}-${index}`} className="border-b last:border-b-0">
                                <th className="bg-muted px-3 py-2 text-left font-medium align-top w-36">{entry.label}</th>
                                <td className="px-3 py-2 text-muted-foreground">{entry.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No hay notas adicionales.</p>
                    )}
                  </div>
                  <p><strong>ID:</strong> {modalTransaction.id}</p>
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
                  {(modalTransaction.cashRegisterName || modalTransaction.cashRegisterId !== undefined) && (
                    <p>
                      <strong>Caja:</strong> {modalTransaction.cashRegisterName ?? 'Caja'}{modalTransaction.cashRegisterId !== undefined ? ` (#${modalTransaction.cashRegisterId})` : ''}
                    </p>
                  )}
                  {(modalTransaction.expectedAmount !== undefined) && (
                    <p><strong>Monto esperado:</strong> {(modalTransaction.currency ?? 'S/.')} {Number(modalTransaction.expectedAmount).toFixed(2)}</p>
                  )}
                  {(modalTransaction.discrepancy !== undefined) && (
                    <p><strong>Diferencia:</strong> {(modalTransaction.currency ?? 'S/.')} {Number(modalTransaction.discrepancy).toFixed(2)}</p>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }
