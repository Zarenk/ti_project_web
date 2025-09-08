  "use client"

  import { useState } from "react"
  import { ArrowDown, ArrowUp, Calculator, Search, ChevronDown, ChevronUp, Calendar } from "lucide-react"
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
  import { Input } from "@/components/ui/input"
  import { Button } from "@/components/ui/button"
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
  import { Badge } from "@/components/ui/badge"
  import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
  import { Calendar as CalendarComponent } from "@/components/ui/calendar"
  import { format, isSameDay } from "date-fns"
  import { Transaction } from "../types/cash-register"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

  interface TransactionHistoryProps {
    transactions: Transaction[]
    selectedDate: Date
    onDateChange: (date: Date) => void
  }

  export default function TransactionHistory({ transactions, selectedDate, onDateChange }: TransactionHistoryProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [typeFilter, setTypeFilter] = useState<string | null>(null)
    const [date, setDate] = useState<Date | undefined>(undefined)
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
      String(transaction.amount).includes(searchTerm) || // 👈 para buscar también por monto si quieres
      (transaction.voucher ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.clientName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.clientDocument ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.paymentMethods ?? []).some((method) =>
        method.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const matchesType = typeFilter ? transaction.type === typeFilter : true

      const matchesDate =
      format(new Date(transaction.timestamp), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
      
      return matchesSearch && matchesType && matchesDate
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
      setDate(undefined)
      onDateChange(new Date()) // 👈 esto reinicia el filtro a hoy
    }

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768

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
                sortedTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
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
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium">S/.{transaction.amount.toFixed(2)}</div>
                      {transaction.type === "deposit" && transaction.discrepancy !== undefined && (
                        <div
                          className={`text-xs ${
                            transaction.discrepancy === 0
                              ? "text-green-500"
                              : transaction.discrepancy > 0
                                ? "text-amber-500"
                                : "text-red-500"
                          }`}
                        >
                          {transaction.discrepancy === 0
                            ? "Balanced"
                            : transaction.discrepancy > 0
                              ? `+$${transaction.discrepancy.toFixed(2)} overage`
                              : `-$${Math.abs(transaction.discrepancy).toFixed(2)} shortage`}
                        </div>
                      )}
                    </TableCell>
                    {!isMobile && <TableCell>{transaction.voucher || "-"}</TableCell>}
                    {!isMobile && (
                      <TableCell className="max-w-[200px] truncate">
                        {transaction.clientName
                          ? `${transaction.clientName} (${transaction.clientDocumentType}: ${transaction.clientDocument})`
                          : "-"}
                      </TableCell>
                    )}
                    {!isMobile &&<TableCell>{transaction.employee}</TableCell>}
                     {!isMobile && <TableCell className="flex flex-wrap gap-1">
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
                  </TableCell>}
                  {!isMobile && <TableCell className="max-w-[200px] truncate">{transaction.description || "-"}</TableCell>}
                  </TableRow>
                ))
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
                  <p><strong>Notas:</strong> {modalTransaction.description || "-"}</p>
                  <p><strong>ID:</strong> {modalTransaction.id}</p>
                  {modalTransaction.voucher && (
                    <p><strong>Comprobante:</strong> {modalTransaction.voucher}</p>
                  )}
                  {modalTransaction.clientName && (
                    <p><strong>Cliente:</strong> {modalTransaction.clientName}</p>
                  )}
                  {modalTransaction.clientDocument && (
                    <p>
                      <strong>Documento:</strong> {modalTransaction.clientDocumentType}: {modalTransaction.clientDocument}
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
