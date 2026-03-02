'use client'

import { GripVertical, Eye, EyeOff, Lock, Unlock, Type, ImageIcon, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CanvasElement } from './ad-editor-types'

interface LayersPanelProps {
  elements: CanvasElement[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleVisible: (id: string) => void
  onToggleLock: (id: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onRemove: (id: string) => void
}

const typeIcons = {
  text: Type,
  image: ImageIcon,
  shape: Square,
}

export function LayersPanel({
  elements,
  selectedId,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onRemove,
}: LayersPanelProps) {
  return (
    <div className="flex flex-col gap-1">
      {[...elements].reverse().map((el) => {
        const Icon = typeIcons[el.type] || Square
        const isSelected = selectedId === el.id
        return (
          <div
            key={el.id}
            className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${
              isSelected
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted'
            }`}
            onClick={() => onSelect(el.id)}
          >
            <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            <Icon className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate">{el.name}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="rounded p-0.5 hover:bg-muted-foreground/10"
                onClick={(e) => { e.stopPropagation(); onToggleVisible(el.id) }}
              >
                {el.visible ? (
                  <Eye className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-3 w-3 text-muted-foreground/50" />
                )}
              </button>
              <button
                className="rounded p-0.5 hover:bg-muted-foreground/10"
                onClick={(e) => { e.stopPropagation(); onToggleLock(el.id) }}
              >
                {el.locked ? (
                  <Lock className="h-3 w-3 text-muted-foreground/50" />
                ) : (
                  <Unlock className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        )
      })}
      {elements.length === 0 && (
        <p className="px-2 py-4 text-center text-xs text-muted-foreground">
          Sin elementos
        </p>
      )}
    </div>
  )
}
