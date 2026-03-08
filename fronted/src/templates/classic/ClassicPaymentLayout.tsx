"use client"

import type { PaymentLayoutProps } from "../types"

export default function ClassicPaymentLayout({ children, className }: PaymentLayoutProps & { children?: React.ReactNode }) {
  return <div className={className}>{children}</div>
}
