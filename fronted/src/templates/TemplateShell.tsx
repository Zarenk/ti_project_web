"use client"

import type { TemplateId } from "./types"
import { useTemplateComponents } from "./use-store-template"

interface TemplateShellProps {
  templateId: TemplateId
  children: React.ReactNode
}

/**
 * Wraps children with the template's Navbar and Footer.
 * Used in public-facing layouts to provide consistent chrome
 * that adapts to the active store template.
 *
 * The templateId is resolved server-side and passed as a prop
 * to prevent SSR/hydration mismatch.
 */
export default function TemplateShell({ templateId, children }: TemplateShellProps) {
  const { Navbar, Footer } = useTemplateComponents(templateId)

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
