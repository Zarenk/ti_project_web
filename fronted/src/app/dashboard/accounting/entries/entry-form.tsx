"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Trash2, CheckCircle2, XCircle, Search } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

import {
  type AccountOption,
  type CreateEntryPayload,
  createEntry,
  fetchAccounts,
  formatAmount,
} from "./entries.api"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LineState {
  key: string
  accountId: number | null
  accountLabel: string
  description: string
  debit: string
  credit: string
}

interface EntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/* ------------------------------------------------------------------ */
/*  Account Picker                                                     */
/* ------------------------------------------------------------------ */

function AccountPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: AccountOption[]
  value: number | null
  onChange: (id: number, label: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const postingAccounts = useMemo(
    () => accounts.filter((a) => a.isPosting),
    [accounts],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return postingAccounts
    const q = search.toLowerCase()
    return postingAccounts.filter(
      (a) =>
        a.code.includes(q) ||
        a.name.toLowerCase().includes(q),
    )
  }, [postingAccounts, search])

  const selectedLabel = useMemo(() => {
    if (!value) return ""
    const found = accounts.find((a) => a.id === value)
    return found ? `${found.code} - ${found.name}` : ""
  }, [accounts, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-start text-left font-normal truncate h-9 text-sm",
            !value && "text-muted-foreground",
          )}
        >
          {value ? (
            <span className="truncate">{selectedLabel}</span>
          ) : (
            "Seleccionar cuenta..."
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="h-[240px]">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron cuentas
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    onChange(account.id, `${account.code} - ${account.name}`)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                    value === account.id && "bg-accent",
                  )}
                >
                  <code className="text-xs font-medium text-sky-700 dark:text-sky-400 shrink-0">
                    {account.code}
                  </code>
                  <span className="truncate text-left">{account.name}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let lineKeyCounter = 0
function newLine(): LineState {
  lineKeyCounter += 1
  return {
    key: `line-${lineKeyCounter}`,
    accountId: null,
    accountLabel: "",
    description: "",
    debit: "",
    credit: "",
  }
}

function parseNum(val: string): number {
  const n = parseFloat(val)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EntryForm({ open, onOpenChange, onSuccess }: EntryFormProps) {
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [moneda, setMoneda] = useState<"PEN" | "USD">("PEN")
  const [tipoCambio, setTipoCambio] = useState("")
  const [lines, setLines] = useState<LineState[]>(() => [newLine(), newLine()])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      fetchAccounts().then(setAccounts).catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setDate(new Date().toISOString().split("T")[0])
      setDescription("")
      setMoneda("PEN")
      setTipoCambio("")
      setLines([newLine(), newLine()])
    }
  }, [open])

  const totalDebit = useMemo(
    () => lines.reduce((s, l) => s + parseNum(l.debit), 0),
    [lines],
  )
  const totalCredit = useMemo(
    () => lines.reduce((s, l) => s + parseNum(l.credit), 0),
    [lines],
  )
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01
  const hasAmounts = totalDebit > 0 || totalCredit > 0

  const updateLine = useCallback(
    (key: string, patch: Partial<LineState>) => {
      setLines((prev) =>
        prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
      )
    },
    [],
  )

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }, [])

  const handleSubmit = async () => {
    if (!date) { toast.error("Seleccione una fecha"); return }
    if (lines.length < 2) { toast.error("Debe tener al menos 2 líneas"); return }

    const mapped = lines.map((l) => ({
      accountId: l.accountId ?? 0,
      description: l.description || undefined,
      debit: parseNum(l.debit),
      credit: parseNum(l.credit),
    }))

    const missingAccount = mapped.some((l) => !l.accountId)
    if (missingAccount) { toast.error("Todas las líneas deben tener una cuenta"); return }

    const invalidAmounts = mapped.some((l) => l.debit === 0 && l.credit === 0)
    if (invalidAmounts) { toast.error("Cada línea debe tener debe o haber mayor a 0"); return }

    const bothSides = mapped.some((l) => l.debit > 0 && l.credit > 0)
    if (bothSides) { toast.error("Una línea no puede tener debe y haber al mismo tiempo"); return }

    if (!balanced) { toast.error("El asiento debe estar balanceado (Debe = Haber)"); return }

    const payload: CreateEntryPayload = {
      date: new Date(date).toISOString(),
      description: description || undefined,
      source: "MANUAL",
      moneda,
      tipoCambio: tipoCambio ? parseFloat(tipoCambio) : undefined,
      lines: mapped,
    }

    setSubmitting(true)
    try {
      await createEntry(payload)
      toast.success("Asiento creado correctamente")
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear asiento")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg">Nuevo Asiento Contable</DialogTitle>
          <DialogDescription>
            Registre un asiento manual. El Debe y Haber deben estar balanceados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6">
          {/* Cabecera del asiento */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="entry-date">Fecha</Label>
              <Input
                id="entry-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select value={moneda} onValueChange={(v) => setMoneda(v as "PEN" | "USD")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PEN">PEN (S/.)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {moneda === "USD" && (
              <div className="space-y-1.5">
                <Label>Tipo de Cambio</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="3.750"
                  value={tipoCambio}
                  onChange={(e) => setTipoCambio(e.target.value)}
                />
              </div>
            )}
            <div className={cn("space-y-1.5", moneda === "USD" ? "" : "sm:col-span-2")}>
              <Label>Glosa / Descripción</Label>
              <Textarea
                placeholder="Ej: Pago de planilla del mes de enero"
                rows={1}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-9 resize-none"
              />
            </div>
          </div>

          {/* Líneas del asiento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Líneas del Asiento
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, newLine()])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Agregar línea
              </Button>
            </div>

            {/* Desktop: tabla */}
            <div className="hidden sm:block rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[260px]">
                      Cuenta
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                      Descripción
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-[130px]">
                      Debe
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-[130px]">
                      Haber
                    </th>
                    <th className="w-[44px]" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} className="border-t">
                      <td className="px-3 py-1.5">
                        <AccountPicker
                          accounts={accounts}
                          value={line.accountId}
                          onChange={(id, label) =>
                            updateLine(line.key, { accountId: id, accountLabel: label })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          placeholder="Glosa específica..."
                          className="h-9"
                          value={line.description}
                          onChange={(e) =>
                            updateLine(line.key, { description: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="h-9 text-right font-mono"
                          value={line.debit}
                          onChange={(e) =>
                            updateLine(line.key, { debit: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="h-9 text-right font-mono"
                          value={line.credit}
                          onChange={(e) =>
                            updateLine(line.key, { credit: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        {lines.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive/70 hover:text-destructive"
                            onClick={() => removeLine(line.key)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="border-t-2 bg-muted/30 font-medium">
                    <td className="px-3 py-2 text-sm" colSpan={2}>
                      Totales
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm">
                      {formatAmount(totalDebit)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-sm">
                      {formatAmount(totalCredit)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="sm:hidden space-y-3">
              {lines.map((line, index) => (
                <div key={line.key} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Línea {index + 1}
                    </span>
                    {lines.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70"
                        onClick={() => removeLine(line.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <AccountPicker
                    accounts={accounts}
                    value={line.accountId}
                    onChange={(id, label) =>
                      updateLine(line.key, { accountId: id, accountLabel: label })
                    }
                  />
                  <Input
                    placeholder="Descripción..."
                    value={line.description}
                    onChange={(e) =>
                      updateLine(line.key, { description: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Debe</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="text-right font-mono"
                        value={line.debit}
                        onChange={(e) =>
                          updateLine(line.key, { debit: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Haber</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="text-right font-mono"
                        value={line.credit}
                        onChange={(e) =>
                          updateLine(line.key, { credit: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Mobile totals */}
              <div className="rounded-lg border-2 p-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Debe</span>
                  <span className="font-mono">{formatAmount(totalDebit)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium mt-1">
                  <span>Total Haber</span>
                  <span className="font-mono">{formatAmount(totalCredit)}</span>
                </div>
              </div>
            </div>

            {/* Balance indicator */}
            {hasAmounts && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  balanced
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
                )}
              >
                {balanced ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Asiento balanceado (Debe = Haber)
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 shrink-0" />
                    Desbalanceado — Diferencia: {formatAmount(Math.abs(totalDebit - totalCredit))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !balanced || !hasAmounts}
          >
            {submitting ? "Creando..." : "Crear Asiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
