import { resolveImageUrl } from "@/lib/images"
import type { MenuItem, MenuAppearance, MenuPalette } from "./menu-types"

export function getItemImage(item: MenuItem): string | null {
  const src = item.image || item.images?.[0]
  return src ? resolveImageUrl(src) : null
}

export function buildPalette(appearance: MenuAppearance): MenuPalette {
  const isDark = appearance.theme === "dark"
  const bgColor = appearance.backgroundColor
  const textColor = appearance.textColor
  const accentColor = appearance.primaryColor

  return {
    isDark,
    bgColor,
    textColor,
    accentColor,
    mutedText: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
    subtleText: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    cardBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    cardHoverBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
    surfaceBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
    pillActiveBg: accentColor,
    pillActiveText: isDark ? "#000" : "#fff",
    pillBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    dotColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
  }
}
