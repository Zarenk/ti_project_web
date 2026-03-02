'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import type { CanvasElement } from './ad-editor-types'

interface PropertiesPanelProps {
  element: CanvasElement | null
  onChange: (id: string, updates: Partial<CanvasElement>) => void
}

const FONT_FAMILIES = ['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New']
const PRESET_COLORS = ['#FFFFFF', '#000000', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']

export function PropertiesPanel({ element, onChange }: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Selecciona un elemento para editar sus propiedades
        </p>
      </div>
    )
  }

  const update = (updates: Partial<CanvasElement>) => onChange(element.id, updates)

  return (
    <div className="space-y-4 p-3">
      {/* Name */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nombre</Label>
        <Input
          className="h-7 text-xs"
          value={element.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>

      {/* Text properties */}
      {element.type === 'text' && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Texto</Label>
            <textarea
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              value={element.text || ''}
              onChange={(e) => update({ text: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fuente</Label>
              <Select value={element.fontFamily} onValueChange={(v) => update({ fontFamily: v })}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tamaño</Label>
              <Input
                className="h-7 text-xs"
                type="number"
                min={8}
                max={200}
                value={element.fontSize || 32}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Color</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                className="h-7 w-7 cursor-pointer rounded border"
                value={element.fill || '#FFFFFF'}
                onChange={(e) => update({ fill: e.target.value })}
              />
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      element.fill === c ? 'scale-110 ring-2 ring-primary ring-offset-1' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => update({ fill: c })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Alineación</Label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  className={`flex-1 rounded-md border px-2 py-1 text-[10px] transition-colors ${
                    element.align === a ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                  onClick={() => update({ align: a })}
                >
                  {a === 'left' ? 'Izq' : a === 'center' ? 'Centro' : 'Der'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Shape properties */}
      {element.type === 'shape' && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Relleno</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                className="h-7 w-7 cursor-pointer rounded border"
                value={element.shapeFill || '#3B82F6'}
                onChange={(e) => update({ shapeFill: e.target.value })}
              />
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      element.shapeFill === c ? 'scale-110 ring-2 ring-primary ring-offset-1' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => update({ shapeFill: c })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Esquinas ({element.cornerRadius || 0}px)
            </Label>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[element.cornerRadius || 0]}
              onValueChange={([v]) => update({ cornerRadius: v })}
            />
          </div>
        </>
      )}

      {/* Common: Position */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Posición</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">X</span>
            <Input
              className="h-7 text-xs"
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => update({ x: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Y</span>
            <Input
              className="h-7 text-xs"
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => update({ y: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Common: Size */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tamaño</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">W</span>
            <Input
              className="h-7 text-xs"
              type="number"
              value={Math.round(element.width)}
              onChange={(e) => update({ width: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">H</span>
            <Input
              className="h-7 text-xs"
              type="number"
              value={Math.round(element.height)}
              onChange={(e) => update({ height: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Common: Rotation */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Rotación ({Math.round(element.rotation)}°)
        </Label>
        <Slider
          min={0}
          max={360}
          step={1}
          value={[element.rotation]}
          onValueChange={([v]) => update({ rotation: v })}
        />
      </div>

      {/* Common: Opacity */}
      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Opacidad ({Math.round(element.opacity * 100)}%)
        </Label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[element.opacity]}
          onValueChange={([v]) => update({ opacity: v })}
        />
      </div>
    </div>
  )
}
