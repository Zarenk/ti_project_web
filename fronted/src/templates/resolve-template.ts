import type { TemplateId } from "./types"

const VALID_TEMPLATES: readonly TemplateId[] = ["classic", "elegance", "bold"] as const

/**
 * Safely resolve a template ID from an unknown value.
 * Returns "classic" as fallback for invalid/missing/corrupted values.
 */
export function resolveTemplate(value: unknown): TemplateId {
  if (
    typeof value === "string" &&
    VALID_TEMPLATES.includes(value as TemplateId)
  ) {
    return value as TemplateId
  }
  return "classic"
}

/** Template metadata for the selector UI */
export const TEMPLATE_META: Record<
  TemplateId,
  { label: string; description: string }
> = {
  classic: {
    label: "Classic",
    description:
      "Diseño tech-forward con paleta sky-blue. Familiar, funcional y confiable.",
  },
  elegance: {
    label: "Elegance",
    description:
      "Minimalista de lujo. Espacioso, editorial, inspirado en Apple Store.",
  },
  bold: {
    label: "Bold",
    description:
      "Vibrante y energético. Gradientes, glass-morphism, estilo Vercel/Linear.",
  },
}
