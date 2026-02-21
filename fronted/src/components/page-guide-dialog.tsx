"use client"

import { useState } from "react"
import {
  CircleHelp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/* ── Types ────────────────────────────────────── */

export type GuideStep = {
  icon: React.ReactNode
  title: string
  description: string
  tips: string[]
}

/* ── Dialog ───────────────────────────────────── */

type PageGuideDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  steps: GuideStep[]
}

export function PageGuideDialog({
  open,
  onOpenChange,
  steps,
}: PageGuideDialogProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  const handleOpenChange = (value: boolean) => {
    if (!value) setCurrentStep(0)
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] gap-0 p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>

        <DialogHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {step.icon}
              </div>
              <div>
                <DialogTitle className="text-base">
                  {step.title}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Paso {currentStep + 1} de {steps.length}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="tabular-nums text-[10px] shrink-0"
            >
              {currentStep + 1}/{steps.length}
            </Badge>
          </div>
        </DialogHeader>

        {/* Step content */}
        <div className="px-5 py-4 sm:px-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          {/* Tips */}
          <div className="mt-4 space-y-2">
            {step.tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-md border border-border/50 bg-muted/30 px-3 py-2"
              >
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary tabular-nums">
                  {i + 1}
                </span>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step navigation dots */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === currentStep
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
              )}
              onClick={() => setCurrentStep(i)}
              aria-label={`Ir al paso ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t border-border/40 px-5 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={isFirst}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </Button>

          {isLast ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => handleOpenChange(false)}
            >
              Entendido
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setCurrentStep((s) => s + 1)}
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Trigger button ───────────────────────────── */

type PageGuideButtonProps = {
  steps: GuideStep[]
  tooltipLabel?: string
}

export function PageGuideButton({
  steps,
  tooltipLabel = "Guía de esta sección",
}: PageGuideButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative flex h-6 w-6 items-center justify-center rounded-full p-0",
                "bg-primary text-primary-foreground shadow-md",
                "cursor-pointer transition-colors duration-200",
                "hover:bg-primary/90 hover:shadow-lg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                "animate-guide-breathe",
              )}
              onClick={() => setOpen(true)}
            >
              <CircleHelp className="h-[22px] w-[22px]" strokeWidth={2.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-medium">
            {tooltipLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PageGuideDialog open={open} onOpenChange={setOpen} steps={steps} />
    </>
  )
}
