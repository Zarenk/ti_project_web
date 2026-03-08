"use client"

import { useSiteSettings } from "@/context/site-settings-context"
import { resolveTemplate } from "./resolve-template"
import type { TemplateId } from "./types"

/**
 * Returns the active store template ID from SiteSettings context.
 * Always returns a valid TemplateId (falls back to "classic").
 */
export function useActiveTemplate(): TemplateId {
  const { settings } = useSiteSettings()
  return resolveTemplate(settings.storeTemplate)
}
