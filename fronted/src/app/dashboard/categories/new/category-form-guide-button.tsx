"use client"

import { PageGuideButton } from "@/components/page-guide-dialog"
import { CATEGORY_FORM_GUIDE_STEPS } from "./category-form-guide-steps"

export function CategoryFormGuideButton() {
  return (
    <PageGuideButton
      steps={CATEGORY_FORM_GUIDE_STEPS}
      tooltipLabel="Guía del formulario"
    />
  )
}
