"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Check } from "lucide-react"
import type { MenuConfigData } from "../digital-menu.api"

type MenuStyle = MenuConfigData["appearance"]["menuStyle"]

interface Props {
  config: MenuConfigData
  onChange: (patch: Partial<MenuConfigData>) => void
}

const STYLE_PRESETS: {
  id: MenuStyle
  name: string
  description: string
  defaults: { theme: "dark" | "light"; primaryColor: string; backgroundColor: string; textColor: string }
  preview: {
    headerFont: string
    bodyFont: string
    ornament: boolean
    cardStyle: "rounded" | "sharp" | "minimal" | "bordered"
  }
}[] = [
  {
    id: "elegante",
    name: "Elegante",
    description: "Serif tipografico con ornamentos decorativos y lineas punteadas",
    defaults: { theme: "dark", primaryColor: "#f59e0b", backgroundColor: "#1a1a1a", textColor: "#ffffff" },
    preview: { headerFont: "Georgia, serif", bodyFont: "system-ui", ornament: true, cardStyle: "rounded" },
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "Premium con bordes dorados, fondo oscuro profundo y tipografia refinada",
    defaults: { theme: "dark", primaryColor: "#d4a853", backgroundColor: "#1c0f0f", textColor: "#f5e6d3" },
    preview: { headerFont: "Georgia, serif", bodyFont: "system-ui", ornament: true, cardStyle: "bordered" },
  },
  {
    id: "moderno",
    name: "Moderno",
    description: "Limpio y minimalista con sans-serif, fondo claro y iconos de categoria",
    defaults: { theme: "light", primaryColor: "#3b82f6", backgroundColor: "#ffffff", textColor: "#111827" },
    preview: { headerFont: "system-ui", bodyFont: "system-ui", ornament: false, cardStyle: "minimal" },
  },
  {
    id: "tropical",
    name: "Tropical",
    description: "Cabecera audaz, tipografia bold, grid de dos columnas estilo playa",
    defaults: { theme: "dark", primaryColor: "#dc2626", backgroundColor: "#2d2d2d", textColor: "#ffffff" },
    preview: { headerFont: "'Arial Black', sans-serif", bodyFont: "system-ui", ornament: false, cardStyle: "sharp" },
  },
]

export function AppearanceSection({ config, onChange }: Props) {
  const { appearance } = config

  const setAppearance = (patch: Partial<MenuConfigData["appearance"]>) => {
    onChange({ appearance: { ...appearance, ...patch } })
  }

  const selectStyle = (style: typeof STYLE_PRESETS[number]) => {
    setAppearance({
      menuStyle: style.id,
      ...style.defaults,
    })
  }

  const currentStyle = appearance.menuStyle || "elegante"

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
        <CardDescription>Elige un estilo prediseñado y personaliza los colores de tu carta digital</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* ─── Style selector ──────────────────────────── */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Estilo de carta</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {STYLE_PRESETS.map((style) => {
              const selected = currentStyle === style.id
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => selectStyle(style)}
                  className={`
                    group relative cursor-pointer overflow-hidden rounded-xl border-2 text-left
                    transition-all duration-300 ease-out
                    ${selected
                      ? "border-primary ring-2 ring-primary/20 shadow-lg"
                      : "border-border hover:border-muted-foreground/30 hover:shadow-md"
                    }
                  `}
                >
                  {/* Mini preview */}
                  <div
                    className="relative h-32 w-full overflow-hidden"
                    style={{ backgroundColor: style.defaults.backgroundColor }}
                  >
                    {/* Preview header */}
                    <div className="px-4 pt-4">
                      {style.preview.ornament && (
                        <div className="mb-1.5 flex items-center justify-center gap-1.5">
                          <span className="block h-px w-6" style={{ backgroundColor: style.defaults.primaryColor }} />
                          <span className="block h-1 w-1 rounded-full" style={{ backgroundColor: style.defaults.primaryColor }} />
                          <span className="block h-px w-6" style={{ backgroundColor: style.defaults.primaryColor }} />
                        </div>
                      )}
                      <p
                        className="text-center text-sm font-bold"
                        style={{
                          color: style.defaults.textColor,
                          fontFamily: style.preview.headerFont,
                        }}
                      >
                        Nombre del Restaurante
                      </p>
                    </div>
                    {/* Preview items */}
                    <div className="mt-3 px-4 space-y-1.5">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                          style={{
                            borderRadius: style.preview.cardStyle === "rounded" ? 8 : style.preview.cardStyle === "sharp" ? 2 : 0,
                            backgroundColor:
                              style.preview.cardStyle === "minimal"
                                ? "transparent"
                                : style.defaults.theme === "dark"
                                  ? "rgba(255,255,255,0.06)"
                                  : "rgba(0,0,0,0.04)",
                            border:
                              style.preview.cardStyle === "bordered"
                                ? `1px solid ${style.defaults.primaryColor}30`
                                : style.preview.cardStyle === "minimal"
                                  ? `none`
                                  : "none",
                            borderBottom:
                              style.preview.cardStyle === "minimal"
                                ? `1px solid ${style.defaults.theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`
                                : undefined,
                            padding: "6px 8px",
                          }}
                        >
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: style.defaults.textColor, fontFamily: style.preview.bodyFont }}
                          >
                            Plato de ejemplo {i}
                          </span>
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: style.defaults.primaryColor }}
                          >
                            S/. 25
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Selected check */}
                    {selected && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className="border-t px-4 py-3 bg-card">
                    <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-foreground"}`}>
                      {style.name}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {style.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── Theme toggle ───────────────────────────── */}
        <div className="space-y-2">
          <Label>Tema base</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={appearance.theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setAppearance({ theme: "dark", backgroundColor: "#0a0a0a", textColor: "#ffffff" })}
              className="cursor-pointer gap-2"
            >
              <Moon className="h-4 w-4" /> Oscuro
            </Button>
            <Button
              type="button"
              variant={appearance.theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setAppearance({ theme: "light", backgroundColor: "#ffffff", textColor: "#111827" })}
              className="cursor-pointer gap-2"
            >
              <Sun className="h-4 w-4" /> Claro
            </Button>
          </div>
        </div>

        {/* ─── Color pickers ──────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Color de acento</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="primaryColor"
                value={appearance.primaryColor}
                onChange={(e) => setAppearance({ primaryColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border"
              />
              <Input
                value={appearance.primaryColor}
                onChange={(e) => setAppearance({ primaryColor: e.target.value })}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bgColor">Color de fondo</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="bgColor"
                value={appearance.backgroundColor}
                onChange={(e) => setAppearance({ backgroundColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border"
              />
              <Input
                value={appearance.backgroundColor}
                onChange={(e) => setAppearance({ backgroundColor: e.target.value })}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* ─── Preview swatch ─────────────────────────── */}
        <div className="space-y-2">
          <Label>Vista previa de colores</Label>
          <div
            className="rounded-lg border p-4"
            style={{ backgroundColor: appearance.backgroundColor }}
          >
            <p style={{ color: appearance.textColor }} className="text-sm font-medium">
              Texto de ejemplo
            </p>
            <p style={{ color: appearance.primaryColor }} className="text-sm font-bold mt-1">
              S/. 25.00 — Color de acento
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
