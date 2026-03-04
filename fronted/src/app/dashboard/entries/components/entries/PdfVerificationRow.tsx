"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { Check, Plus, Link2, Hash, X, Pencil, ArrowRightLeft } from "lucide-react"
import { useRef, useState } from "react"
import type { MatchCandidate } from "../../utils/fuzzy-match"
import type { ExtractedProduct } from "../../utils/series-batch-validator"

export interface VerificationDecision {
  /** Index in the original extracted products array */
  extractedIndex: number
  /** "link" to existing product, or "new" to create */
  action: "link" | "new"
  /** If linked, the existing product id */
  linkedProductId?: number
  /** Final price to use (purchase) */
  price: number
  /** Final priceSell to use */
  priceSell: number
  /** Final name (from linked product or original) */
  name: string
  /** Quantity from PDF */
  quantity: number
  /** Category */
  category_name: string
  /** Series */
  series?: string[]
}

interface Props {
  extracted: ExtractedProduct
  extractedIndex: number
  candidates: MatchCandidate[]
  decision: VerificationDecision
  onDecisionChange: (decision: VerificationDecision) => void
  currency?: "USD" | "PEN"
  exchangeRate?: number | null
}

function scoreColor(score: number) {
  if (score >= 0.85) return "border-green-500 bg-green-50 dark:bg-green-950/30"
  if (score >= 0.5) return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30"
  return "border-muted"
}

function scoreBadge(score: number) {
  const pct = Math.round(score * 100)
  if (score >= 0.85) return <Badge variant="default" className="bg-green-600 text-xs">{pct}%</Badge>
  if (score >= 0.5) return <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">{pct}%</Badge>
  return <Badge variant="outline" className="text-xs">{pct}%</Badge>
}

export function PdfVerificationRow({
  extracted,
  extractedIndex,
  candidates,
  decision,
  onDecisionChange,
  currency,
  exchangeRate,
}: Props) {
  const isUsd = currency === "USD"
  const currencySymbol = isUsd ? "US$" : "S/."
  const topCandidate = candidates[0]
  const borderClass = topCandidate
    ? scoreColor(topCandidate.score)
    : "border-muted"

  const [newSerial, setNewSerial] = useState("")
  const serialInputRef = useRef<HTMLInputElement>(null)
  const [viewInUsd, setViewInUsd] = useState(false)
  const canConvert = isUsd && !!exchangeRate && exchangeRate > 0

  const handleRadioChange = (value: string) => {
    if (value === "new") {
      onDecisionChange({
        ...decision,
        action: "new",
        linkedProductId: undefined,
        name: extracted.name,
        priceSell: decision.priceSell || 0,
      })
    } else {
      const productId = parseInt(value, 10)
      const match = candidates.find((c) => c.product.id === productId)
      if (match) {
        onDecisionChange({
          ...decision,
          action: "link",
          linkedProductId: match.product.id,
          name: match.product.name,
          priceSell: match.product.priceSell ?? 0,
        })
      }
    }
  }

  const handleAddSerial = () => {
    const trimmed = newSerial.trim().toUpperCase()
    if (!trimmed) return
    const currentSeries = decision.series || []
    if (currentSeries.includes(trimmed)) {
      setNewSerial("")
      return
    }
    onDecisionChange({
      ...decision,
      series: [...currentSeries, trimmed],
    })
    setNewSerial("")
    serialInputRef.current?.focus()
  }

  const handleRemoveSerial = (serial: string) => {
    onDecisionChange({
      ...decision,
      series: (decision.series || []).filter((s) => s !== serial),
    })
  }

  const selectedRadioValue =
    decision.action === "new"
      ? "new"
      : String(decision.linkedProductId ?? "new")

  const seriesCount = (decision.series || []).length

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-3 sm:p-4 space-y-3 w-full min-w-0 overflow-hidden",
        borderClass
      )}
    >
      {/* ── Editable Name ── */}
      <div className="space-y-1.5 w-full min-w-0">
        <div className="flex items-center gap-1.5">
          <Pencil className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <Label className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre del producto</Label>
        </div>
        <Input
          type="text"
          className="h-9 text-sm font-semibold"
          value={decision.name}
          onChange={(e) =>
            onDecisionChange({ ...decision, name: e.target.value })
          }
        />
      </div>

      {/* ── Quantity + Purchase Price (editable) ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full min-w-0">
        <div className="space-y-1.5">
          <Label className="text-[10px] sm:text-xs text-muted-foreground">Cantidad</Label>
          <Input
            type="number"
            min="1"
            step="1"
            className="h-9 text-sm font-semibold"
            value={decision.quantity || ""}
            onChange={(e) =>
              onDecisionChange({
                ...decision,
                quantity: parseInt(e.target.value) || 0,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] sm:text-xs text-muted-foreground">
            P.Compra ({currencySymbol})
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            className="h-9 text-sm font-semibold"
            value={decision.price || ""}
            onChange={(e) =>
              onDecisionChange({
                ...decision,
                price: parseFloat(e.target.value) || 0,
              })
            }
          />
          {isUsd && exchangeRate && exchangeRate > 0 && (
            <p className="text-[10px] text-muted-foreground/70">
              ≈ S/. {(decision.price * exchangeRate).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* ── Candidates radio group ── */}
      <div className="space-y-2">
        <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vincular con:</p>
        <RadioGroup
          value={selectedRadioValue}
          onValueChange={handleRadioChange}
          className="space-y-1.5"
        >
          {candidates.map((c) => (
            <label
              key={c.product.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors w-full min-w-0",
                selectedRadioValue === String(c.product.id)
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <RadioGroupItem value={String(c.product.id)} className="flex-shrink-0" />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm break-words min-w-0">{c.product.name}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {scoreBadge(c.score)}
                {c.score >= 0.85 && <Check className="h-3.5 w-3.5 text-green-600" />}
              </div>
            </label>
          ))}

          {/* Create new option */}
          <label
            className={cn(
              "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors w-full min-w-0",
              selectedRadioValue === "new"
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            <RadioGroupItem value="new" className="flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <Plus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">Crear producto nuevo</span>
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* ── Price info + sell price ── */}
      <div className="pt-2 border-t space-y-2 w-full min-w-0">
        {/* Currency toggle header — only when USD + linked */}
        {canConvert && decision.action === "link" && decision.linkedProductId && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Precios de referencia
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px] gap-1 cursor-pointer transition-colors"
              onClick={() => setViewInUsd((v) => !v)}
            >
              <ArrowRightLeft className="h-3 w-3" />
              {viewInUsd ? "Ver en S/." : "Ver en US$"}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full min-w-0">
          {decision.action === "link" && decision.linkedProductId && (() => {
            const linked = candidates.find((c) => c.product.id === decision.linkedProductId)
            if (!linked) return null
            const regPen = linked.product.price
            const sellPen = linked.product.priceSell ?? 0
            return (
              <>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground">P.Compra registrado</Label>
                  <p className="text-sm font-medium px-3 py-1.5 bg-muted/50 rounded-md">
                    {viewInUsd && canConvert
                      ? `US$ ${(regPen / exchangeRate!).toFixed(2)}`
                      : `S/. ${regPen.toFixed(2)}`}
                  </p>
                  {canConvert && (
                    <p className="text-[10px] text-muted-foreground/70">
                      ≈ {viewInUsd
                        ? `S/. ${regPen.toFixed(2)}`
                        : `US$ ${(regPen / exchangeRate!).toFixed(2)}`}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] sm:text-xs text-muted-foreground">P.Venta actual</Label>
                  <p className="text-sm font-medium px-3 py-1.5 bg-muted/50 rounded-md">
                    {viewInUsd && canConvert
                      ? `US$ ${(sellPen / exchangeRate!).toFixed(2)}`
                      : `S/. ${sellPen.toFixed(2)}`}
                  </p>
                  {canConvert && (
                    <p className="text-[10px] text-muted-foreground/70">
                      ≈ {viewInUsd
                        ? `S/. ${sellPen.toFixed(2)}`
                        : `US$ ${(sellPen / exchangeRate!).toFixed(2)}`}
                    </p>
                  )}
                </div>
              </>
            )
          })()}
          <div className={cn("space-y-1", decision.action === "link" && decision.linkedProductId ? "" : "sm:col-span-3")}>
            <Label className="text-[10px] sm:text-xs text-muted-foreground">
              P.Venta a usar (S/.)
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              className="h-9 text-sm"
              value={decision.priceSell || ""}
              onChange={(e) =>
                onDecisionChange({
                  ...decision,
                  priceSell: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0.00"
            />
            {canConvert && decision.priceSell > 0 && (
              <p className="text-[10px] text-muted-foreground/70">
                ≈ US$ {(decision.priceSell / exchangeRate!).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Series Section ── */}
      <div className="pt-2 border-t space-y-2 w-full min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Series / N° de Serie</span>
          </div>
          {seriesCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {seriesCount} / {decision.quantity}
            </Badge>
          )}
        </div>

        {/* Add serial input */}
        <div className="flex gap-2 w-full min-w-0">
          <Input
            ref={serialInputRef}
            type="text"
            className="h-8 text-xs font-mono flex-1 min-w-0 uppercase"
            placeholder="Ingresa N° de serie y presiona Enter"
            value={newSerial}
            onChange={(e) => setNewSerial(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAddSerial()
              }
            }}
            disabled={seriesCount >= decision.quantity}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 flex-shrink-0 cursor-pointer"
            onClick={handleAddSerial}
            disabled={!newSerial.trim() || seriesCount >= decision.quantity}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Series list */}
        {seriesCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(decision.series || []).map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 pl-2 pr-1 py-0.5 rounded text-xs font-mono group"
              >
                {s}
                <button
                  type="button"
                  onClick={() => handleRemoveSerial(s)}
                  className="hover:bg-red-100 dark:hover:bg-red-900/30 rounded p-0.5 transition-colors cursor-pointer"
                  aria-label={`Quitar serie ${s}`}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-red-500 transition-colors" />
                </button>
              </span>
            ))}
          </div>
        )}

        {seriesCount >= decision.quantity && decision.quantity > 0 && (
          <p className="text-[10px] text-green-600 dark:text-green-400">
            Todas las series ingresadas ({seriesCount}/{decision.quantity})
          </p>
        )}
      </div>
    </div>
  )
}
