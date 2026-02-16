"use client"

import { Info, HelpCircle, Lightbulb } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface EducationalTooltipProps {
  /**
   * The educational content to display in the tooltip
   */
  content: string

  /**
   * Optional title for the tooltip
   */
  title?: string

  /**
   * The trigger element. If not provided, uses a default info icon
   */
  children?: React.ReactNode

  /**
   * Type of tooltip - affects icon and styling
   */
  variant?: "info" | "help" | "tip"

  /**
   * Icon size
   */
  iconSize?: "sm" | "md" | "lg"

  /**
   * Additional CSS classes for the trigger
   */
  className?: string

  /**
   * Position of the tooltip
   */
  side?: "top" | "right" | "bottom" | "left"

  /**
   * Maximum width of tooltip content
   */
  maxWidth?: "xs" | "sm" | "md" | "lg"
}

const iconSizes = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

const maxWidths = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
}

export function EducationalTooltip({
  content,
  title,
  children,
  variant = "info",
  iconSize = "md",
  className,
  side = "top",
  maxWidth = "sm",
}: EducationalTooltipProps) {
  const getIcon = () => {
    const iconClass = cn(
      "text-muted-foreground cursor-help transition-colors hover:text-foreground",
      iconSizes[iconSize]
    )

    switch (variant) {
      case "help":
        return <HelpCircle className={iconClass} />
      case "tip":
        return <Lightbulb className={iconClass} />
      case "info":
      default:
        return <Info className={iconClass} />
    }
  }

  const getVariantStyles = () => {
    switch (variant) {
      case "help":
        return "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800"
      case "tip":
        return "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800"
      case "info":
      default:
        return ""
    }
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild className={className}>
          {children || (
            <button
              type="button"
              className="inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
              aria-label={title || "Más información"}
            >
              {getIcon()}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className={cn(
            maxWidths[maxWidth],
            "p-4",
            getVariantStyles()
          )}
        >
          {title && (
            <div className="font-semibold mb-2 text-sm">{title}</div>
          )}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Inline variant - displays the icon inline with text
 */
interface InlineEducationalTooltipProps extends Omit<EducationalTooltipProps, 'children'> {
  /**
   * The text to display alongside the icon
   */
  label: string
}

export function InlineEducationalTooltip({
  label,
  content,
  title,
  variant = "info",
  iconSize = "sm",
  className,
  side = "top",
  maxWidth = "sm",
}: InlineEducationalTooltipProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span>{label}</span>
      <EducationalTooltip
        content={content}
        title={title}
        variant={variant}
        iconSize={iconSize}
        side={side}
        maxWidth={maxWidth}
      />
    </span>
  )
}
