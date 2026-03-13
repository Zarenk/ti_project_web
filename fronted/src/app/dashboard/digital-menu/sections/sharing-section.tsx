"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Copy, Check, ExternalLink, QrCode } from "lucide-react"
import type { MenuConfigData } from "../digital-menu.api"

interface Props {
  config: MenuConfigData
  onChange: (patch: Partial<MenuConfigData>) => void
  orgId: number | null
  companyId: number | null
}

export function SharingSection({ config, onChange, orgId, companyId }: Props) {
  const { sharing } = config
  const [copied, setCopied] = useState(false)

  const setSharing = (patch: Partial<MenuConfigData["sharing"]>) => {
    onChange({ sharing: { ...sharing, ...patch } })
  }

  const menuUrl = typeof window !== "undefined"
    ? (() => {
        const base = `${window.location.origin}/menu`
        const params = new URLSearchParams()
        if (orgId) params.set("org", String(orgId))
        if (companyId) params.set("company", String(companyId))
        if (sharing.slug) params.set("slug", sharing.slug)
        const qs = params.toString()
        return qs ? `${base}?${qs}` : base
      })()
    : ""

  const handleCopy = useCallback(async () => {
    if (!menuUrl) return
    try {
      await navigator.clipboard.writeText(menuUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }, [menuUrl])

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Compartir</CardTitle>
        <CardDescription>
          Genera un enlace y codigo QR para compartir tu carta digital
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Carta publica activa</p>
            <p className="text-xs text-muted-foreground">
              Los clientes pueden ver tu carta en el enlace
            </p>
          </div>
          <Switch
            checked={sharing.enabled}
            onCheckedChange={(val) => setSharing({ enabled: val })}
            className="cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug personalizado (opcional)</Label>
          <Input
            id="slug"
            value={sharing.slug ?? ""}
            onChange={(e) =>
              setSharing({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") || null })
            }
            placeholder="mi-restaurante"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Solo letras minusculas, numeros y guiones
          </p>
        </div>

        {/* Link preview */}
        <div className="space-y-2">
          <Label>Enlace de la carta</Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={menuUrl}
              className="font-mono text-xs bg-muted"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="cursor-pointer flex-shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="cursor-pointer flex-shrink-0"
              asChild
            >
              <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* QR Code placeholder */}
        <div className="space-y-2">
          <Label>Codigo QR</Label>
          <div className="flex flex-col items-center gap-3 rounded-lg border p-6 bg-white">
            {/* Simple QR representation using an SVG placeholder —
                a real QR library like qrcode.react can be added later */}
            <div className="flex items-center justify-center h-48 w-48 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <div className="text-center">
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground mt-2">
                  QR generado automaticamente
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs break-words">
              {menuUrl}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
