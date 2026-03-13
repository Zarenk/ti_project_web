"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import type { MenuConfigData } from "../digital-menu.api"

interface Props {
  config: MenuConfigData
  onChange: (patch: Partial<MenuConfigData>) => void
}

export function BrandingSection({ config, onChange }: Props) {
  const { branding } = config

  const setBranding = (patch: Partial<MenuConfigData["branding"]>) => {
    onChange({ branding: { ...branding, ...patch } })
  }

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Marca del Restaurante</CardTitle>
        <CardDescription>Informacion que aparece en el encabezado de tu carta</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="restaurantName">Nombre del restaurante</Label>
          <Input
            id="restaurantName"
            value={branding.restaurantName}
            onChange={(e) => setBranding({ restaurantName: e.target.value })}
            placeholder="Mi Restaurante"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripcion</Label>
          <Textarea
            id="description"
            value={branding.description}
            onChange={(e) => setBranding({ description: e.target.value })}
            placeholder="Descubre nuestros platos preparados con los mejores ingredientes"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Mostrar buscador</p>
            <p className="text-xs text-muted-foreground">Permite a los clientes buscar platos en la carta</p>
          </div>
          <Switch
            checked={branding.showSearch}
            onCheckedChange={(val) => setBranding({ showSearch: val })}
            className="cursor-pointer"
          />
        </div>
      </CardContent>
    </Card>
  )
}
