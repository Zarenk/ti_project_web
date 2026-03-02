/**
 * Fuzzy string matching for product name similarity.
 * No external dependencies — pure utility functions.
 */

export interface MatchCandidate {
  product: { id: number; name: string; price: number; priceSell: number | null }
  score: number
}

/** Normalize a string for comparison: uppercase, collapse separators/whitespace */
export function normalizeForMatch(str: string): string {
  return str
    .toUpperCase()
    .replace(/[+\/\\.\-_,;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Extract alphanumeric model/SKU codes (e.g. TE4071, RTX4060, SA400) */
function extractModelCodes(str: string): string[] {
  const matches = str.match(/\b[A-Z0-9]{2,}[-]?[A-Z0-9]{2,}\b/gi) || []
  return matches.map((m) => m.toUpperCase())
}

/** Tokenize a string into unique word set */
function tokenize(str: string): Set<string> {
  return new Set(str.split(" ").filter((t) => t.length > 0))
}

/** Jaccard similarity on token sets (weight 0.4) */
function tokenSetSimilarity(a: string, b: string): number {
  const setA = tokenize(a)
  const setB = tokenize(b)
  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0

  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection++
  }
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

/** Levenshtein distance between two strings */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  // Use two rows instead of full matrix for memory efficiency
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

/** Normalized Levenshtein similarity (weight 0.3) */
function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

/** Substring/contains check (weight 0.2) */
function containsSimilarity(a: string, b: string): number {
  if (a.includes(b) || b.includes(a)) return 1
  // Check if the shorter string shares a long common prefix
  const minLen = Math.min(a.length, b.length)
  let prefixLen = 0
  while (prefixLen < minLen && a[prefixLen] === b[prefixLen]) {
    prefixLen++
  }
  return prefixLen / minLen
}

/** Model number match score (weight 0.1) */
function modelNumberSimilarity(a: string, b: string): number {
  const modelsA = extractModelCodes(a)
  const modelsB = extractModelCodes(b)
  if (modelsA.length === 0 || modelsB.length === 0) return 0

  let matches = 0
  for (const m of modelsA) {
    if (modelsB.some((mb) => mb === m || mb.includes(m) || m.includes(mb))) {
      matches++
    }
  }
  return matches / Math.max(modelsA.length, modelsB.length)
}

/** Compute composite similarity score between two product names (0-1) */
export function computeSimilarity(a: string, b: string): number {
  const normA = normalizeForMatch(a)
  const normB = normalizeForMatch(b)

  if (normA === normB) return 1.0

  const lev = levenshteinSimilarity(normA, normB)
  const token = tokenSetSimilarity(normA, normB)
  const contains = containsSimilarity(normA, normB)
  const model = modelNumberSimilarity(normA, normB)

  return lev * 0.3 + token * 0.4 + contains * 0.2 + model * 0.1
}

/**
 * Find best matching products for an extracted product name.
 * @returns Top candidates sorted by score, filtered by threshold
 */
export function findBestMatches(
  extractedName: string,
  existingProducts: { id: number; name: string; price: number; priceSell: number | null }[],
  maxResults = 5,
  threshold = 0.3
): MatchCandidate[] {
  const scored = existingProducts
    .map((product) => ({
      product,
      score: computeSimilarity(extractedName, product.name),
    }))
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)

  return scored
}
