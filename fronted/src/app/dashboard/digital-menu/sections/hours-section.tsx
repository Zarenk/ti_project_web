"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { MenuConfigData } from "../digital-menu.api"

interface Props {
  config: MenuConfigData
  onChange: (patch: Partial<MenuConfigData>) => void
}

export function HoursSection({ config, onChange }: Props) {
  const { hours } = config

  const setHours = (patch: Partial<MenuConfigData["hours"]>) => {
    onChange({ hours: { ...hours, ...patch } })
  }

  const updateDay = (idx: number, patch: Partial<MenuConfigData["hours"]["schedule"][number]>) => {
    const updated = hours.schedule.map((d, i) => (i === idx ? { ...d, ...patch } : d))
    setHours({ schedule: updated })
  }

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Horarios de Atencion</CardTitle>
        <CardDescription>Muestra tus horarios en la carta digital</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Mostrar horarios</p>
            <p className="text-xs text-muted-foreground">Visible en la carta publica</p>
          </div>
          <Switch
            checked={hours.enabled}
            onCheckedChange={(val) => setHours({ enabled: val })}
            className="cursor-pointer"
          />
        </div>

        {hours.enabled && (
          <div className="space-y-3">
            {hours.schedule.map((day, idx) => (
              <div
                key={day.day}
                className="flex items-center gap-3 rounded-lg border px-4 py-3"
              >
                <div className="w-24 flex-shrink-0">
                  <Label className="text-sm font-medium">{day.day}</Label>
                </div>
                <Switch
                  checked={!day.closed}
                  onCheckedChange={(open) => updateDay(idx, { closed: !open })}
                  className="cursor-pointer flex-shrink-0"
                />
                {!day.closed ? (
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <Input
                      type="time"
                      value={day.open}
                      onChange={(e) => updateDay(idx, { open: e.target.value })}
                      className="w-full max-w-[120px]"
                    />
                    <span className="text-muted-foreground text-xs flex-shrink-0">a</span>
                    <Input
                      type="time"
                      value={day.close}
                      onChange={(e) => updateDay(idx, { close: e.target.value })}
                      className="w-full max-w-[120px]"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Cerrado</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
