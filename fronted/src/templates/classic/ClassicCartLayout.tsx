"use client"

import type { CartLayoutProps } from "../types"

export default function ClassicCartLayout({ children, className }: CartLayoutProps & { children?: React.ReactNode }) {
  return <div className={className}>{children}</div>
}
