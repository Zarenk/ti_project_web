"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, FileText, Loader2, Plus, Link2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { findBestMatches, type MatchCandidate } from "../../utils/fuzzy-match"
import {
  validateExtractedSeries,
  type ExtractedProduct,
  type SeriesConflict,
  type InternalDuplicate,
} from "../../utils/series-batch-validator"
import {
  PdfVerificationRow,
  type VerificationDecision,
} from "./PdfVerificationRow"
import { SeriesConflictSection } from "./SeriesConflictSection"

interface ExistingProduct {
  id: number
  name: string
  price: number
  priceSell: number | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  extractedProducts: ExtractedProduct[]
  existingProducts: ExistingProduct[]
  onConfirm: (products: ExtractedProduct[]) => void
}

export function PdfVerificationDialog({
  open,
  onOpenChange,
  extractedProducts,
  existingProducts,
  onConfirm,
}: Props) {
  const [decisions, setDecisions] = useState<VerificationDecision[]>([])
  const [matchResults, setMatchResults] = useState<MatchCandidate[][]>([])
  const [seriesConflicts, setSeriesConflicts] = useState<SeriesConflict[]>([])
  const [internalDuplicates, setInternalDuplicates] = useState<InternalDuplicate[]>([])
  const [removedSerials, setRemovedSerials] = useState<Set<string>>(new Set())
  const [isValidating, setIsValidating] = useState(false)

  // Compute matches and validate series when dialog opens
  useEffect(() => {
    if (!open || extractedProducts.length === 0) return

    // 1. Fuzzy matching (synchronous, client-side)
    const matches = extractedProducts.map((ep) =>
      findBestMatches(ep.name, existingProducts)
    )
    setMatchResults(matches)

    // 2. Initialize decisions based on match scores
    const initialDecisions: VerificationDecision[] = extractedProducts.map(
      (ep, idx) => {
        const topMatch = matches[idx]?.[0]
        const autoLink = topMatch && topMatch.score >= 0.85

        return {
          extractedIndex: idx,
          action: autoLink ? "link" : "new",
          linkedProductId: autoLink ? topMatch.product.id : undefined,
          price: ep.price,
          priceSell: autoLink ? (topMatch.product.priceSell ?? 0) : (ep.priceSell || 0),
          name: autoLink ? topMatch.product.name : ep.name,
          quantity: ep.quantity,
          category_name: ep.category_name,
          series: ep.series,
        }
      }
    )
    setDecisions(initialDecisions)

    // 3. Series validation (async, 1 API call)
    const hasSeries = extractedProducts.some(
      (ep) => ep.series && ep.series.length > 0
    )
    if (hasSeries) {
      setIsValidating(true)
      validateExtractedSeries(extractedProducts)
        .then((result) => {
          setSeriesConflicts(result.conflicts)
          setInternalDuplicates(result.internalDuplicates)
          // Auto-mark conflicting serials as removed
          const autoRemoved = new Set<string>()
          result.conflicts.forEach((c) => autoRemoved.add(c.serial))
          result.internalDuplicates.forEach((d) => autoRemoved.add(d.serial))
          setRemovedSerials(autoRemoved)
        })
        .catch((err) => {
          console.error("Error validating series:", err)
          toast.error("Error al verificar series. Se omitirá la validación.")
        })
        .finally(() => setIsValidating(false))
    } else {
      setSeriesConflicts([])
      setInternalDuplicates([])
      setRemovedSerials(new Set())
    }
  }, [open, extractedProducts, existingProducts])

  const handleDecisionChange = useCallback(
    (updated: VerificationDecision) => {
      setDecisions((prev) =>
        prev.map((d) =>
          d.extractedIndex === updated.extractedIndex ? updated : d
        )
      )
    },
    []
  )

  const handleToggleRemove = useCallback((serial: string) => {
    setRemovedSerials((prev) => {
      const next = new Set(prev)
      if (next.has(serial)) {
        next.delete(serial)
      } else {
        next.add(serial)
      }
      return next
    })
  }, [])

  const handleConfirm = useCallback(() => {
    const finalProducts: ExtractedProduct[] = decisions.map((d) => {
      // Remove conflicting/duplicate serials from the product
      const cleanSeries = (d.series || []).filter(
        (s) => !removedSerials.has(s)
      )

      return {
        id: d.action === "link" ? d.linkedProductId : undefined,
        name: d.name,
        quantity: d.quantity,
        price: d.price,
        priceSell: d.priceSell,
        category_name: d.category_name,
        series: cleanSeries.length > 0 ? cleanSeries : undefined,
      }
    })

    onConfirm(finalProducts)
    onOpenChange(false)
  }, [decisions, removedSerials, onConfirm, onOpenChange])

  // Summary counts
  const summary = useMemo(() => {
    const linked = decisions.filter((d) => d.action === "link").length
    const newProducts = decisions.filter((d) => d.action === "new").length
    const seriesRemoved = removedSerials.size
    return { linked, newProducts, seriesRemoved }
  }, [decisions, removedSerials])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-5 w-5 flex-shrink-0" />
            Verificación de Productos Extraídos
          </DialogTitle>
          <DialogDescription className="text-sm">
            Se encontraron{" "}
            <strong>{extractedProducts.length}</strong> productos en el
            PDF. Revisa y vincula con productos existentes.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 sm:px-6 py-4 space-y-4">
            {/* Series conflicts section */}
            {isValidating ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md border">
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                Verificando series...
              </div>
            ) : (
              <SeriesConflictSection
                conflicts={seriesConflicts}
                internalDuplicates={internalDuplicates}
                extractedProducts={extractedProducts}
                removedSerials={removedSerials}
                onToggleRemove={handleToggleRemove}
              />
            )}

            {/* Product verification rows */}
            {extractedProducts.map((ep, idx) => (
              <PdfVerificationRow
                key={idx}
                extracted={ep}
                extractedIndex={idx}
                candidates={matchResults[idx] || []}
                decision={
                  decisions[idx] || {
                    extractedIndex: idx,
                    action: "new",
                    price: ep.price,
                    priceSell: 0,
                    name: ep.name,
                    quantity: ep.quantity,
                    category_name: ep.category_name,
                    series: ep.series,
                  }
                }
                onDecisionChange={handleDecisionChange}
              />
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="gap-1">
                <Link2 className="h-3 w-3" />
                {summary.linked} vinculados
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Plus className="h-3 w-3" />
                {summary.newProducts} nuevos
              </Badge>
              {summary.seriesRemoved > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  {summary.seriesRemoved} series removidas
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isValidating}
                className="flex-1 sm:flex-none gap-1.5 cursor-pointer"
              >
                <CheckCircle className="h-4 w-4" />
                Confirmar {extractedProducts.length} prod.
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
