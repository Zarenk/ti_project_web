import type { HelpEntry, HelpSearchResult, HelpSection } from "./types"

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean)
}

function scoreEntry(query: string, entry: HelpEntry): number {
  const normalizedQuery = normalize(query)
  const queryTokens = tokenize(query)

  // Exact match on question or any alias
  const allTexts = [entry.question, ...entry.aliases]
  for (const text of allTexts) {
    if (normalize(text) === normalizedQuery) return 1.0
  }

  // Token-based matching
  let bestScore = 0

  for (const text of allTexts) {
    const textTokens = tokenize(text)
    let matchedTokens = 0

    for (const qt of queryTokens) {
      const hasMatch = textTokens.some(
        (tt) => tt === qt || tt.includes(qt) || qt.includes(tt),
      )
      if (hasMatch) matchedTokens++
    }

    const tokenScore = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0
    if (tokenScore > bestScore) bestScore = tokenScore
  }

  // Substring match on answer (lower weight)
  const normalizedAnswer = normalize(entry.answer)
  if (normalizedAnswer.includes(normalizedQuery)) {
    bestScore = Math.max(bestScore, 0.4)
  }

  return Math.min(bestScore, 1.0)
}

export function searchKnowledgeBase(
  query: string,
  sections: HelpSection[],
  currentSectionId: string | null,
  userRole?: string,
): HelpSearchResult[] {
  const results: HelpSearchResult[] = []

  for (const section of sections) {
    for (const entry of section.entries) {
      // Filter by role if entry has role restriction
      if (entry.roles && entry.roles.length > 0 && userRole) {
        if (!entry.roles.includes(userRole)) continue
      }

      let score = scoreEntry(query, entry)

      // Context bonus: entries in current section get +0.2
      if (currentSectionId && section.id === currentSectionId) {
        score = Math.min(score + 0.2, 1.0)
      }

      if (score > 0.3) {
        results.push({ entry, score, sectionId: section.id })
      }
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

export const STATIC_CONFIDENCE_THRESHOLD = 0.6
