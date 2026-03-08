"use client"

import { useMemo } from "react"
import type { TemplateId, TemplateComponents } from "./types"
import { getTemplateComponents } from "./registry"

/**
 * Client-side hook that returns the template components for a given template ID.
 * The templateId should be resolved server-side and passed as prop to avoid
 * hydration mismatch.
 */
export function useTemplateComponents(templateId: TemplateId): TemplateComponents {
  return useMemo(() => getTemplateComponents(templateId), [templateId])
}
