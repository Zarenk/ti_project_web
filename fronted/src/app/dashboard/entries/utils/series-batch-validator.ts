import { batchCheckSeries } from "../entries.api"

export interface ExtractedProduct {
  id?: number
  name: string
  quantity: number
  price: number
  priceSell: number
  category_name: string
  series?: string[]
}

export interface SeriesConflict {
  serial: string
  productIndex: number
  exists: boolean
}

export interface InternalDuplicate {
  serial: string
  productIndexA: number
  productIndexB: number
}

export interface SeriesValidationResult {
  conflicts: SeriesConflict[]
  internalDuplicates: InternalDuplicate[]
}

/**
 * Validates all extracted series in batch:
 * 1. Detects internal duplicates (same serial across products in the same extraction)
 * 2. Checks against backend for already-registered series (1 API call)
 */
export async function validateExtractedSeries(
  extractedProducts: ExtractedProduct[]
): Promise<SeriesValidationResult> {
  const allSeries = extractedProducts.flatMap((p, idx) =>
    (p.series || []).map((s) => ({ serial: s.trim(), productIndex: idx }))
  )

  if (allSeries.length === 0) {
    return { conflicts: [], internalDuplicates: [] }
  }

  // Detect internal duplicates
  const seen = new Map<string, number>()
  const internalDuplicates: InternalDuplicate[] = []
  for (const item of allSeries) {
    if (seen.has(item.serial)) {
      internalDuplicates.push({
        serial: item.serial,
        productIndexA: seen.get(item.serial)!,
        productIndexB: item.productIndex,
      })
    } else {
      seen.set(item.serial, item.productIndex)
    }
  }

  // Batch check against backend
  const uniqueSerials = [...new Set(allSeries.map((s) => s.serial))]
  const results = await batchCheckSeries(uniqueSerials)

  // Map results back to product indices
  const conflicts = results
    .filter((r) => r.exists)
    .flatMap((r) =>
      allSeries
        .filter((s) => s.serial === r.serial)
        .map((s) => ({ serial: s.serial, productIndex: s.productIndex, exists: true }))
    )

  return { conflicts, internalDuplicates }
}
