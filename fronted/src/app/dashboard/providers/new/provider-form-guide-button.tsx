"use client"

import { PageGuideButton } from "@/components/page-guide-dialog"
import { PROVIDER_FORM_GUIDE_STEPS } from "./provider-form-guide-steps"

export function ProviderFormGuideButton() {
  return (
    <PageGuideButton
      steps={PROVIDER_FORM_GUIDE_STEPS}
      tooltipLabel="Guía del formulario"
    />
  )
}
