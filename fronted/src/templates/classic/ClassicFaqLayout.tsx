"use client"

import type { FaqLayoutProps } from "../types"

export default function ClassicFaqLayout({ children, className }: FaqLayoutProps & { children?: React.ReactNode }) {
  return <div className={className}>{children}</div>
}
