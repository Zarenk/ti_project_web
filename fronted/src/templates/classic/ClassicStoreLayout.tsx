"use client"

/**
 * Classic store layout — currently the store page (`/store`) is a monolithic
 * client component. This wrapper will be expanded when the store page is
 * refactored to separate data-fetching from presentation (Phase 5).
 *
 * For now, importing this component confirms the Classic template contract.
 */
import type { StoreLayoutProps } from "../types"

export default function ClassicStoreLayout({ children }: StoreLayoutProps) {
  return <>{children}</>
}
