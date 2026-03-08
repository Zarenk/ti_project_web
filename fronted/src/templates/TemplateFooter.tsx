"use client"

import { useSiteSettings } from "@/context/site-settings-context"
import { useTemplateComponents } from "./use-store-template"
import { resolveTemplate } from "./resolve-template"
import type { FooterProps } from "./types"

/**
 * Template-aware Footer that renders the correct Footer component
 * based on the active store template from SiteSettings.
 */
export default function TemplateFooter(props: FooterProps) {
  const { settings } = useSiteSettings()
  const templateId = resolveTemplate(settings.storeTemplate)
  const { Footer } = useTemplateComponents(templateId)

  return <Footer {...props} />
}
