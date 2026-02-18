"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { GripVertical, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { updateRestaurantTable, type RestaurantTable } from "./tables.api"

const STATUS_FILL: Record<RestaurantTable["status"], string> = {
  AVAILABLE: "bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30",
  OCCUPIED: "bg-rose-500/20 border-rose-500/50 hover:bg-rose-500/30",
  RESERVED: "bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30",
  DISABLED: "bg-sky-500/20 border-sky-500/50 hover:bg-sky-500/30",
}

const STATUS_LABEL: Record<RestaurantTable["status"], string> = {
  AVAILABLE: "Libre",
  OCCUPIED: "Ocupada",
  RESERVED: "Reservada",
  DISABLED: "Limpieza",
}

const STATUS_DOT: Record<RestaurantTable["status"], string> = {
  AVAILABLE: "bg-emerald-400",
  OCCUPIED: "bg-rose-400",
  RESERVED: "bg-amber-400",
  DISABLED: "bg-sky-400",
}

const GRID_SIZE = 20
const TABLE_W = 120
const TABLE_H = 80

type Props = {
  tables: RestaurantTable[]
  onTableClick?: (table: RestaurantTable) => void
  onPositionSaved?: () => void
  editMode: boolean
}

export function TableFloorPlan({ tables, onTableClick, onPositionSaved, editMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({})

  const getPosition = useCallback(
    (table: RestaurantTable) => {
      if (positions[table.id]) return positions[table.id]
      if (table.positionX != null && table.positionY != null) {
        return { x: table.positionX, y: table.positionY }
      }
      // Auto-assign grid positions for tables without saved positions
      const index = tables.findIndex((t) => t.id === table.id)
      const cols = 5
      const col = index % cols
      const row = Math.floor(index / cols)
      return { x: col * (TABLE_W + GRID_SIZE) + GRID_SIZE, y: row * (TABLE_H + GRID_SIZE) + GRID_SIZE }
    },
    [tables, positions],
  )

  const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE

  const handlePointerDown = (e: React.PointerEvent, table: RestaurantTable) => {
    if (!editMode) return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pos = getPosition(table)
    setDragging(table.id)
    setDragOffset({
      x: e.clientX - rect.left - pos.x,
      y: e.clientY - rect.top - pos.y,
    })
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging == null) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const rawX = e.clientX - rect.left - dragOffset.x
    const rawY = e.clientY - rect.top - dragOffset.y
    setPositions((prev) => ({
      ...prev,
      [dragging]: { x: snap(Math.max(0, rawX)), y: snap(Math.max(0, rawY)) },
    }))
  }

  const handlePointerUp = async () => {
    if (dragging == null) return
    const id = dragging
    setDragging(null)
    const pos = positions[id]
    if (!pos) return
    try {
      await updateRestaurantTable(id, { positionX: pos.x, positionY: pos.y })
      onPositionSaved?.()
    } catch {
      toast.error("No se pudo guardar la posicion de la mesa.")
    }
  }

  // Calculate canvas dimensions based on table positions
  const allPositions = tables.map(getPosition)
  const canvasWidth = Math.max(
    700,
    ...allPositions.map((p) => p.x + TABLE_W + GRID_SIZE * 2),
  )
  const canvasHeight = Math.max(
    400,
    ...allPositions.map((p) => p.y + TABLE_H + GRID_SIZE * 2),
  )

  return (
    <div className="space-y-2">
      {editMode && (
        <p className="text-xs text-muted-foreground">
          Arrastra las mesas para reorganizar el plano. Las posiciones se guardan automaticamente.
        </p>
      )}
      <div
        ref={containerRef}
        className="relative overflow-auto rounded-xl border border-white/10 bg-muted/10"
        style={{ minHeight: canvasHeight, width: "100%" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Grid pattern */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r="0.5" fill="currentColor" className="text-white/10" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {tables.map((table) => {
          const pos = getPosition(table)
          const isDragging = dragging === table.id
          return (
            <div
              key={table.id}
              className={cn(
                "absolute flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-shadow select-none",
                STATUS_FILL[table.status],
                isDragging && "z-20 shadow-xl ring-2 ring-primary/50 scale-105",
                editMode && "cursor-grab active:cursor-grabbing",
                !editMode && "cursor-pointer",
              )}
              style={{
                left: pos.x,
                top: pos.y,
                width: TABLE_W,
                height: TABLE_H,
                transition: isDragging ? "none" : "left 0.2s, top 0.2s",
              }}
              onPointerDown={(e) => handlePointerDown(e, table)}
              onClick={() => {
                if (!editMode && onTableClick) onTableClick(table)
              }}
            >
              {editMode && (
                <GripVertical className="absolute -top-0.5 right-1 h-3.5 w-3.5 text-muted-foreground/50" />
              )}
              <span className="text-[11px] font-semibold leading-none">{table.code ?? table.name}</span>
              <div className="flex items-center gap-1">
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[table.status])} />
                <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[table.status]}</span>
              </div>
              {table.capacity && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Users className="h-2.5 w-2.5" /> {table.capacity}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
