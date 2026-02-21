"use client"

import { PageGuideButton } from "@/components/page-guide-dialog"
import { ENTRY_FORM_GUIDE_STEPS } from "./entry-form-guide-steps"

export function EntryFormGuideButton() {
  return (
    <PageGuideButton
      steps={ENTRY_FORM_GUIDE_STEPS}
      tooltipLabel="Guía del formulario"
    />
  )
}
