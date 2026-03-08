"use client"

import type { TrackOrderLayoutProps } from "../types"

export default function ClassicTrackOrderLayout({ children, className }: TrackOrderLayoutProps & { children?: React.ReactNode }) {
  return <div className={className}>{children}</div>
}
