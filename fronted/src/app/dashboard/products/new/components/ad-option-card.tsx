'use client'

import { Check, Copy, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { resolveImageUrl } from '@/lib/images'
import type { AdCopyVariation } from '../../ads.api'

interface AdOptionCardProps {
  variation: AdCopyVariation
  imageUrl?: string
  index: number
  isSelected: boolean
  onSelect: () => void
}

export function AdOptionCard({
  variation,
  imageUrl,
  index,
  isSelected,
  onSelect,
}: AdOptionCardProps) {
  return (
    <div
      className={`group relative cursor-pointer rounded-lg border bg-card p-3 transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'ring-2 ring-primary border-primary scale-[1.02] shadow-md'
          : 'hover:border-muted-foreground/30'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Check className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Image preview */}
      {imageUrl && (
        <div className="mb-3 overflow-hidden rounded-md bg-muted">
          <img
            src={resolveImageUrl(imageUrl)}
            alt={`Opción ${index + 1}`}
            className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </div>
      )}

      {/* Copy content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-tight line-clamp-2">
            {variation.title}
          </h4>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {variation.tone}
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-3">
          {variation.description}
        </p>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1">
          {(variation.hashtags ?? []).slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              {tag}
            </span>
          ))}
          {(variation.hashtags?.length ?? 0) > 4 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              +{variation.hashtags!.length - 4}
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="pt-1">
          <Button
            size="sm"
            variant={isSelected ? 'default' : 'outline'}
            className="h-7 w-full text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
          >
            {isSelected ? 'Seleccionada' : 'Usar esta opción'}
          </Button>
        </div>
      </div>
    </div>
  )
}
