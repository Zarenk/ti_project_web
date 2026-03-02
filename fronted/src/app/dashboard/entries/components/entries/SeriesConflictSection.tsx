"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { AlertTriangle, ChevronDown, Shield } from "lucide-react"
import { useState } from "react"
import type {
  SeriesConflict,
  InternalDuplicate,
  ExtractedProduct,
} from "../../utils/series-batch-validator"

interface Props {
  conflicts: SeriesConflict[]
  internalDuplicates: InternalDuplicate[]
  extractedProducts: ExtractedProduct[]
  /** Set of serials the user has chosen to remove */
  removedSerials: Set<string>
  onToggleRemove: (serial: string) => void
}

export function SeriesConflictSection({
  conflicts,
  internalDuplicates,
  extractedProducts,
  removedSerials,
  onToggleRemove,
}: Props) {
  const [isOpen, setIsOpen] = useState(true)
  const totalIssues = conflicts.length + internalDuplicates.length

  if (totalIssues === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full min-w-0">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span className="text-sm font-medium">Series con conflictos</span>
            <Badge variant="destructive" className="text-xs">
              {totalIssues}
            </Badge>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 pt-2 px-1">
        {/* Backend conflicts: series already registered in the system */}
        {conflicts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground px-2">
              Series ya registradas en el sistema:
            </p>
            {conflicts.map((conflict) => {
              const product = extractedProducts[conflict.productIndex]
              const isRemoved = removedSerials.has(conflict.serial)

              return (
                <div
                  key={`conflict-${conflict.serial}`}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border border-destructive/30 bg-destructive/5 w-full min-w-0 overflow-hidden"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-medium break-all">
                        {conflict.serial}
                      </p>
                      {product && (
                        <p className="text-xs text-muted-foreground break-words">
                          en: {product.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={isRemoved ? "outline" : "destructive"}
                    size="sm"
                    className="h-7 text-xs flex-shrink-0 cursor-pointer"
                    onClick={() => onToggleRemove(conflict.serial)}
                  >
                    {isRemoved ? "Mantener" : "Remover"}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Internal duplicates: same serial in multiple products within the PDF */}
        {internalDuplicates.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground px-2">
              Series duplicadas dentro del PDF:
            </p>
            {internalDuplicates.map((dup) => {
              const productA = extractedProducts[dup.productIndexA]
              const productB = extractedProducts[dup.productIndexB]
              const isRemoved = removedSerials.has(dup.serial)

              return (
                <div
                  key={`dup-${dup.serial}`}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 w-full min-w-0 overflow-hidden"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-medium break-all">
                        {dup.serial}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">
                        en: {productA?.name} y {productB?.name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={isRemoved ? "outline" : "secondary"}
                    size="sm"
                    className="h-7 text-xs flex-shrink-0 cursor-pointer"
                    onClick={() => onToggleRemove(dup.serial)}
                  >
                    {isRemoved ? "Restaurar" : "Remover"}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
