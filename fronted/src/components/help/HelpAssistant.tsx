"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { HelpMascot } from "./HelpMascot"
import { HelpChatPanel } from "./HelpChatPanel"

/** Error boundary to prevent the help assistant from crashing the entire app */
class HelpErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[HelpAssistant] Error caught:", error, info)
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export function HelpAssistant() {
  return (
    <HelpErrorBoundary>
      <HelpChatPanel />
      <HelpMascot />
    </HelpErrorBoundary>
  )
}
