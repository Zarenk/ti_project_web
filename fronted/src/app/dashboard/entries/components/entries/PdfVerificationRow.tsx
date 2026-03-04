"use client"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { Check, Plus, Link2 } from "lucide-react"
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

  const selectedRadioValue =
    decision.action === "new"
      ? "new"
      : String(decision.linkedProductId ?? "new")

  return (
    <div
      className={cn(
        "rounded-lg border-2 p-3 sm:p-4 space-y-3 w-full min-w-0 overflow-hidden",
        borderClass
      )}
    >
      {/* Header: extracted name + quantity + price */}
      <div className="flex flex-col gap-1 w-full min-w-0">
        <div className="flex items-start gap-2 w-full min-w-0">
          <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
            PDF:
          </span>
          <p className="text-sm font-semibold break-words min-w-0">
            {extracted.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pl-7">
          <span>Cant: <strong className="text-foreground">{extracted.quantity}</strong></span>
          <span>
            P.Compra PDF: <strong className="text-foreground">{currencySymbol} {extracted.price.toFixed(2)}</strong>
            {isUsd && exchangeRate && exchangeRate > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground/70">
                ≈ S/. {(extracted.price * exchangeRate).toFixed(2)}
              </span>
            )}
          </span>
          {extracted.series && extracted.series.length > 0 && (
            <span>Series: <strong className="text-foreground">{extracted.series.length}</strong></span>
          )}
        </div>
      </div>

      {/* Candidates radio group */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Vincular con:</p>
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

      {/* Price info section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t w-full min-w-0">
        {decision.action === "link" && decision.linkedProductId && (() => {
          const linked = candidates.find((c) => c.product.id === decision.linkedProductId)
          return linked ? (
            <>
              <div className="text-xs space-y-1">
                <span className="text-muted-foreground">P.Compra registrado:</span>
                <p className="font-medium">S/. {linked.product.price.toFixed(2)}</p>
              </div>
              <div className="text-xs space-y-1">
                <span className="text-muted-foreground">P.Venta actual:</span>
                <p className="font-medium">S/. {(linked.product.priceSell ?? 0).toFixed(2)}</p>
              </div>
            </>
          ) : null
        })()}
        <div className="sm:col-span-2">
          <Label className="text-xs text-muted-foreground">P.Venta a usar:</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="mt-1 h-8 text-sm"
            value={decision.priceSell || ""}
            onChange={(e) =>
              onDecisionChange({
                ...decision,
                priceSell: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="0.00"
          />
        </div>
      </div>
    </div>
  )
}
