"use client"

import { PageGuideButton } from "@/components/page-guide-dialog"
import { PROVIDERS_LIST_GUIDE_STEPS } from "./providers-guide-steps"

export function ProvidersGuideButton() {
  return (
    <PageGuideButton
      steps={PROVIDERS_LIST_GUIDE_STEPS}
      tooltipLabel="Guía de proveedores"
    />
  )
}
