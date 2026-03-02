"use client"

import { cn } from "@/lib/utils"

type StrengthLevel = 0 | 1 | 2 | 3

function computeStrength(password: string): StrengthLevel {
  if (!password || password.length < 8) return 0
  const hasLetter = /[A-Za-z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  if (!hasLetter || !hasDigit) return 1
  if (hasSpecial || password.length >= 12) return 3
  return 2
}

const LEVEL_CONFIG: Record<StrengthLevel, { label: string; color: string }> = {
  0: { label: "Muy débil", color: "bg-red-500" },
  1: { label: "Débil", color: "bg-orange-500" },
  2: { label: "Aceptable", color: "bg-yellow-500" },
  3: { label: "Fuerte", color: "bg-emerald-500" },
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const level = computeStrength(password)
  const config = LEVEL_CONFIG[level]

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i <= level ? config.color : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{config.label}</p>
    </div>
  )
}
