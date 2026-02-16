"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type StepDef = {
  label: string
  description?: string
}

type CatalogStepperProps = {
  steps: StepDef[]
  currentStep: number
  /** Called when a step is clicked. Returns false/undefined to allow, or an error string to block. */
  onStepClick?: (index: number) => void
  /** Which steps are reachable (clickable). If not provided, all non-active steps are clickable. */
  canReachStep?: (index: number) => boolean
}

export function CatalogStepper({
  steps,
  currentStep,
  onStepClick,
  canReachStep,
}: CatalogStepperProps) {
  return (
    <nav aria-label="Progreso" className="w-full">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          const isPending = index > currentStep
          const isLast = index === steps.length - 1
          const isReachable = canReachStep
            ? canReachStep(index)
            : index !== currentStep
          const canClick = isReachable && onStepClick

          return (
            <li
              key={step.label}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              {/* Circle + label */}
              <button
                type="button"
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors",
                  canClick
                    ? "cursor-pointer hover:bg-muted/60"
                    : "cursor-default",
                )}
                onClick={() => canClick && onStepClick(index)}
                disabled={!canClick}
              >
                {/* Step circle */}
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                    isCompleted &&
                      "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25",
                    isActive &&
                      "bg-primary text-primary-foreground shadow-sm shadow-primary/25 ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
                    isPending &&
                      isReachable &&
                      "border-2 border-muted-foreground/40 text-muted-foreground/60",
                    isPending &&
                      !isReachable &&
                      "border-2 border-muted-foreground/20 text-muted-foreground/30",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                {/* Label */}
                <div className="hidden flex-col sm:flex">
                  <span
                    className={cn(
                      "text-sm font-medium leading-tight transition-colors",
                      isCompleted && "text-emerald-600 dark:text-emerald-400",
                      isActive && "text-foreground",
                      isPending &&
                        isReachable &&
                        "text-muted-foreground/70",
                      isPending &&
                        !isReachable &&
                        "text-muted-foreground/40",
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span
                      className={cn(
                        "text-[11px] leading-tight",
                        isActive
                          ? "text-muted-foreground"
                          : "text-muted-foreground/40",
                      )}
                    >
                      {step.description}
                    </span>
                  )}
                </div>
              </button>

              {/* Connector line */}
              {!isLast && (
                <div className="mx-2 h-[2px] flex-1 rounded-full transition-colors duration-500">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCompleted
                        ? "bg-emerald-500/50"
                        : "bg-muted-foreground/15",
                    )}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
