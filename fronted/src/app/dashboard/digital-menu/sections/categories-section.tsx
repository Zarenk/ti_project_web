"use client"

import { useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react"
import type { MenuConfigData } from "../digital-menu.api"
import type { MenuCategory } from "../digital-menu.api"

interface Props {
  config: MenuConfigData
  onChange: (patch: Partial<MenuConfigData>) => void
  availableCategories: MenuCategory[]
}

export function CategoriesSection({ config, onChange, availableCategories }: Props) {
  const catConfig = config.categories

  // Merge available categories with saved config
  const merged = availableCategories.map((cat) => {
    const saved = catConfig.find((c) => c.categoryId === cat.id)
    return {
      categoryId: cat.id,
      name: cat.name,
      productCount: cat.productCount,
      visible: saved?.visible ?? true,
      displayOrder: saved?.displayOrder ?? 999,
      displayName: saved?.displayName ?? null,
    }
  }).sort((a, b) => a.displayOrder - b.displayOrder)

  const updateCategories = useCallback(
    (updater: (list: typeof merged) => typeof merged) => {
      const updated = updater(merged)
      onChange({
        categories: updated.map((c, i) => ({
          categoryId: c.categoryId,
          visible: c.visible,
          displayOrder: i,
          displayName: c.displayName,
        })),
      })
    },
    [merged, onChange],
  )

  const toggleVisibility = (catId: number) => {
    updateCategories((list) =>
      list.map((c) => (c.categoryId === catId ? { ...c, visible: !c.visible } : c)),
    )
  }

  const setDisplayName = (catId: number, name: string) => {
    updateCategories((list) =>
      list.map((c) => (c.categoryId === catId ? { ...c, displayName: name || null } : c)),
    )
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    updateCategories((list) => {
      const next = [...list]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveDown = (idx: number) => {
    updateCategories((list) => {
      if (idx >= list.length - 1) return list
      const next = [...list]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Categorias</CardTitle>
        <CardDescription>
          Ordena, renombra u oculta categorias en tu carta digital
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {merged.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay categorias con productos activos
          </p>
        )}

        {merged.map((cat, idx) => (
          <div
            key={cat.categoryId}
            className={`flex items-center gap-3 rounded-lg border px-3 py-3 transition-opacity ${
              !cat.visible ? "opacity-50" : ""
            }`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium truncate">{cat.name}</Label>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ({cat.productCount} platos)
                </span>
              </div>
              <Input
                placeholder="Nombre personalizado (opcional)"
                value={cat.displayName ?? ""}
                onChange={(e) => setDisplayName(cat.categoryId, e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 cursor-pointer"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 cursor-pointer"
                onClick={() => moveDown(idx)}
                disabled={idx === merged.length - 1}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Switch
                checked={cat.visible}
                onCheckedChange={() => toggleVisibility(cat.categoryId)}
                className="cursor-pointer"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
