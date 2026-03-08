/**
 * Extrae entidades (cantidad, producto, período, etc.) del texto
 * basándose en los grupos capturados por las regex de los patterns.
 */

import type { ParsedEntity } from "./intent-types"

export function extractEntities(
  match: RegExpMatchArray,
  entitySlots: string[],
): ParsedEntity[] {
  const entities: ParsedEntity[] = []

  for (let i = 0; i < entitySlots.length; i++) {
    const raw = match[i + 1]?.trim()
    if (!raw) continue

    const type = entitySlots[i] as ParsedEntity["type"]
    const entity: ParsedEntity = { type, raw }

    switch (type) {
      case "quantity":
        entity.value = parseInt(raw, 10)
        break
      case "amount":
        entity.value = parseFloat(raw)
        break
      case "period":
        entity.value = parsePeriod(raw)
        break
      case "product":
      case "client":
      case "store":
      case "section":
        entity.value = raw
        break
    }

    entities.push(entity)
  }

  return entities
}

export interface PeriodValue {
  start: Date
  end: Date
  label: string
}

export function parsePeriod(text: string): PeriodValue {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const lower = text.toLowerCase().trim()

  if (lower === "hoy") {
    return { start: today, end: now, label: "hoy" }
  }

  if (lower === "ayer") {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return { start: yesterday, end: today, label: "ayer" }
  }

  if (lower === "esta semana") {
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    return { start: weekStart, end: now, label: "esta semana" }
  }

  if (lower === "este mes") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now,
      label: "este mes",
    }
  }

  // "últimos N días"
  const lastNDays = lower.match(/(?:últim[oa]s?|ultim[oa]s?)\s+(\d+)\s+días?/)
  if (lastNDays) {
    const days = parseInt(lastNDays[1], 10)
    const start = new Date(today)
    start.setDate(start.getDate() - days)
    return { start, end: now, label: `últimos ${days} días` }
  }

  // Fallback: hoy
  return { start: today, end: now, label: text }
}
