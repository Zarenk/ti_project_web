"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Star, UtensilsCrossed } from "lucide-react"
import { resolveImageUrl, resolveImageVariant } from "@/lib/images"
import type { MenuConfigData, MenuProduct } from "../digital-menu.api"

interface Props {
  config: MenuConfigData
  onChange: (patch: Partial<MenuConfigData>) => void
  products: MenuProduct[]
}

export function DishesSection({ config, onChange, products }: Props) {
  const [search, setSearch] = useState("")

  const hiddenSet = useMemo(() => new Set(config.hiddenProductIds), [config.hiddenProductIds])
  const overrides = config.productOverrides

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.categoryName ?? "").toLowerCase().includes(q),
    )
  }, [products, search])

  const grouped = useMemo(() => {
    const map = new Map<string, MenuProduct[]>()
    for (const p of filtered) {
      const cat = p.categoryName ?? "Sin categoria"
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    }
    return Array.from(map.entries())
  }, [filtered])

  const toggleHidden = (productId: number) => {
    const newHidden = hiddenSet.has(productId)
      ? config.hiddenProductIds.filter((id) => id !== productId)
      : [...config.hiddenProductIds, productId]
    onChange({ hiddenProductIds: newHidden })
  }

  const toggleFeatured = (productId: number) => {
    const key = String(productId)
    const current = overrides[key]
    const isFeatured = current?.featured ?? false
    onChange({
      productOverrides: {
        ...overrides,
        [key]: { ...current, featured: !isFeatured },
      },
    })
  }

  const setOverrideField = (
    productId: number,
    field: "menuDescription" | "menuPrice",
    value: string,
  ) => {
    const key = String(productId)
    const current = overrides[key] ?? {}
    if (field === "menuPrice") {
      const num = parseFloat(value)
      onChange({
        productOverrides: {
          ...overrides,
          [key]: { ...current, menuPrice: isNaN(num) ? undefined : num },
        },
      })
    } else {
      onChange({
        productOverrides: {
          ...overrides,
          [key]: { ...current, menuDescription: value || undefined },
        },
      })
    }
  }

  const getProductImage = (product: MenuProduct): string | null => {
    const imgPath = product.images?.[0] || product.image
    if (!imgPath) return null
    if (imgPath.endsWith(".webp")) {
      return resolveImageVariant(imgPath, "thumb")
    }
    return resolveImageUrl(imgPath)
  }

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Platos</CardTitle>
        <CardDescription>
          Oculta platos, marca destacados o personaliza precios y descripciones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Buscar plato o categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {grouped.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {search ? "Sin resultados" : "No hay platos activos"}
          </p>
        )}

        {grouped.map(([catName, items]) => (
          <div key={catName} className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground px-1">
              {catName}
            </h4>
            {items.map((product) => {
              const isHidden = hiddenSet.has(product.id)
              const override = overrides[String(product.id)]
              const isFeatured = override?.featured ?? false
              const displayPrice = product.priceSell ?? product.price
              const imageUrl = getProductImage(product)

              return (
                <div
                  key={product.id}
                  className={`rounded-lg border p-3 space-y-2 transition-opacity ${
                    isHidden ? "opacity-40" : ""
                  }`}
                >
                  {/* Header row with image */}
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Product image */}
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border bg-muted/30">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UtensilsCrossed className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Name + badges */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">
                          {product.name}
                        </span>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          S/. {displayPrice.toFixed(2)}
                        </Badge>
                        {override?.menuPrice != null && (
                          <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs flex-shrink-0">
                            Carta: S/. {override.menuPrice.toFixed(2)}
                          </Badge>
                        )}
                        {isFeatured && (
                          <Badge className="bg-amber-500/20 text-amber-600 text-xs flex-shrink-0">
                            Destacado
                          </Badge>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 break-words">
                          {override?.menuDescription || product.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(product.id)}
                        className={`cursor-pointer p-1 rounded transition-colors ${
                          isFeatured
                            ? "text-amber-500"
                            : "text-muted-foreground hover:text-amber-400"
                        }`}
                        title={isFeatured ? "Quitar destacado" : "Marcar como destacado"}
                      >
                        <Star
                          className="h-4 w-4"
                          fill={isFeatured ? "currentColor" : "none"}
                        />
                      </button>

                      <Switch
                        checked={!isHidden}
                        onCheckedChange={() => toggleHidden(product.id)}
                        className="cursor-pointer flex-shrink-0"
                      />
                    </div>
                  </div>

                  {/* Override fields (only if visible) */}
                  {!isHidden && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Descripcion personalizada
                        </Label>
                        <Input
                          placeholder={product.description ?? "Sin descripcion"}
                          value={override?.menuDescription ?? ""}
                          onChange={(e) =>
                            setOverrideField(product.id, "menuDescription", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Precio carta (S/.)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={displayPrice.toFixed(2)}
                          value={override?.menuPrice ?? ""}
                          onChange={(e) =>
                            setOverrideField(product.id, "menuPrice", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
