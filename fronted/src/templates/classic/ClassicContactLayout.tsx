"use client"

import type { ContactLayoutProps } from "../types"

export default function ClassicContactLayout({ children, className }: ContactLayoutProps & { children?: React.ReactNode }) {
  return <div className={className}>{children}</div>
}
