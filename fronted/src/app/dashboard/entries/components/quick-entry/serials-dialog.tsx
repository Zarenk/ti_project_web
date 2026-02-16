"use client"

import { useEffect, useRef, useState } from "react"
import { Barcode, Check, Loader2, AlertTriangle, X, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import { checkSeries } from "../../entries.api"

type SerialStatus = "empty" | "validating" | "valid" | "duplicate" | "error"

type SerialRow = {
  value: string
  status: SerialStatus
}

type ProductSerialsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  quantity: number
  /** Current serials already saved for this product */
  existingSerials: string[]
  /** All serials across ALL products (for cross-product duplicate check) */
  allOtherSerials: string[]
  onSave: (serials: string[]) => void
}

export function ProductSerialsDialog({
  open,
  onOpenChange,
  productName,
  quantity,
  existingSerials,
  allOtherSerials,
  onSave,
}: ProductSerialsDialogProps) {
  const [rows, setRows] = useState<SerialRow[]>([])
  const [newSerial, setNewSerial] = useState("")
  const [addingStatus, setAddingStatus] = useState<SerialStatus>("empty")
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize rows from existing serials when dialog opens
  useEffect(() => {
    if (open) {
      setRows(
        existingSerials.map((s) => ({ value: s, status: "valid" as SerialStatus })),
      )
      setNewSerial("")
      setAddingStatus("empty")
      // Focus the input after a short delay
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, existingSerials])

  // All serials currently in this dialog (for local duplicate check)
  const currentSerials = rows.map((r) => r.value.trim()).filter(Boolean)

  const handleAddSerial = async () => {
    const serial = newSerial.trim()
    if (!serial) {
      toast.error("Ingresa un numero de serie")
      return
    }

    // Check max quantity
    if (rows.length >= quantity) {
      toast.error(`Maximo ${quantity} series para este producto`)
      return
    }

    // Check local duplicates (within this product)
    if (currentSerials.includes(serial)) {
      toast.error("Esta serie ya fue agregada a este producto")
      setAddingStatus("duplicate")
      return
    }

    // Check cross-product duplicates
    if (allOtherSerials.includes(serial)) {
      toast.error("Esta serie ya esta asignada a otro producto")
      setAddingStatus("duplicate")
      return
    }

    // Validate against backend
    setAddingStatus("validating")
    try {
      const result = await checkSeries(serial)
      if (result.exists) {
        toast.error("Esta serie ya existe en el sistema")
        setAddingStatus("duplicate")
        return
      }
    } catch {
      toast.error("Error al verificar la serie")
      setAddingStatus("error")
      return
    }

    // Add to list
    setRows((prev) => [...prev, { value: serial, status: "valid" }])
    setNewSerial("")
    setAddingStatus("empty")
    inputRef.current?.focus()
  }

  const handleRemoveSerial = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      void handleAddSerial()
    }
  }

  const handleSave = () => {
    const serials = rows.map((r) => r.value.trim()).filter(Boolean)
    onSave(serials)
    onOpenChange(false)
  }

  const hasErrors = rows.some(
    (r) => r.status === "duplicate" || r.status === "error",
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-md bg-blue-500/10 p-1.5">
              <Barcode className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </span>
            <span className="truncate">{productName}</span>
          </DialogTitle>
          <DialogDescription>
            Agrega numeros de serie (opcional, max {quantity}).
            Presiona Enter para agregar.
          </DialogDescription>
        </DialogHeader>

        {/* Add serial input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              placeholder="Ej: ABC123456"
              value={newSerial}
              onChange={(e) => {
                setNewSerial(e.target.value)
                setAddingStatus("empty")
              }}
              onKeyDown={handleKeyDown}
              disabled={rows.length >= quantity}
              className={cn(
                "pr-8",
                addingStatus === "duplicate" &&
                  "border-destructive focus-visible:ring-destructive/30",
                addingStatus === "error" &&
                  "border-destructive focus-visible:ring-destructive/30",
              )}
            />
            {addingStatus === "validating" && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <Button
            size="icon"
            className="shrink-0 cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
            onClick={() => void handleAddSerial()}
            disabled={!newSerial.trim() || rows.length >= quantity || addingStatus === "validating"}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Counter */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {rows.length} de {quantity} series ingresadas
          </span>
          {rows.length >= quantity && (
            <Badge variant="secondary" className="text-[10px]">
              Completo
            </Badge>
          )}
        </div>

        {/* Serial list */}
        <div className="max-h-[240px] space-y-1.5 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No se han agregado series aun
            </p>
          ) : (
            rows.map((row, idx) => (
              <div
                key={idx}
                className="group/serial flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-1.5 transition-colors hover:bg-muted/40"
              >
                <span className="w-5 text-right text-[11px] text-muted-foreground tabular-nums">
                  {idx + 1}.
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {row.value}
                </span>
                {row.status === "valid" && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                )}
                {row.status === "duplicate" && (
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                )}
                <button
                  type="button"
                  className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover/serial:opacity-100"
                  onClick={() => handleRemoveSerial(idx)}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)] hover:shadow-[0_0_16px_rgba(59,130,246,0.35)] transition-shadow"
            onClick={handleSave}
            disabled={hasErrors}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Guardar ({rows.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
