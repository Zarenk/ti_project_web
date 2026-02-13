"use client"

import { MapPin, HelpCircle } from "lucide-react"
import { getSectionDisplayName, getContextualSuggestions } from "@/data/help/route-detection"

interface LocationIndicatorProps {
  section: string
  action?: "view" | "create" | "edit" | "list"
  onSuggestionClick?: (suggestion: string) => void
}

/**
 * Indicador visual de ubicación actual del usuario
 * Muestra dónde está y sugiere preguntas relevantes
 */
export function LocationIndicator({ section, action, onSuggestionClick }: LocationIndicatorProps) {
  const sectionName = getSectionDisplayName(section)
  const suggestions = getContextualSuggestions(section)

  // Verbo según la acción
  const actionText = action === "create" ? "creando" : action === "edit" ? "editando" : "en"

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
      {/* Ubicación actual */}
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Estás {actionText} <span className="font-semibold">{sectionName}</span>
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            Puedo ayudarte con preguntas sobre esta sección
          </p>
        </div>
      </div>

      {/* Sugerencias contextuales */}
      {suggestions.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
              Preguntas frecuentes:
            </span>
          </div>

          <div className="space-y-1">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="block w-full rounded-md bg-white px-2.5 py-1.5 text-left text-xs text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-900"
              >
                • {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Versión compacta para mostrar en el header del chat
 */
export function LocationIndicatorCompact({ section }: { section: string }) {
  const sectionName = getSectionDisplayName(section)

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-1 dark:bg-blue-900">
      <MapPin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
      <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
        {sectionName}
      </span>
    </div>
  )
}
