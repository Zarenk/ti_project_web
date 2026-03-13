"use client"

import { memo } from 'react'
import Link from 'next/link'
import { UtensilsCrossed, GlassWater, IceCreamCone, Package } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { ProductFormContext } from './types'

export type ProductSchemaFieldsProps = ProductFormContext & {
  schemaFields: any[]
  groupedSchemaFields: [string, any[]][]
  verticalInfo: any
  verticalName: string
  isLegacyProduct: boolean
  extraFieldError: string | null
  renderSchemaField: (field: any) => React.ReactNode
  productId?: string | number | null
  migrationAssistantPath: string
  productKind?: string | null
  onProductKindChange?: (kind: string) => void
}

const PRODUCT_KINDS = [
  { value: "DISH", label: "Plato", icon: UtensilsCrossed, description: "Preparado en cocina" },
  { value: "BEVERAGE", label: "Bebida", icon: GlassWater, description: "Gaseosas, jugos, cocteles" },
  { value: "DESSERT", label: "Postre", icon: IceCreamCone, description: "Helados, tortas, dulces" },
  { value: "PACKAGED", label: "Empaquetado", icon: Package, description: "Snacks, envasados" },
] as const

const GROUP_DESCRIPTIONS: Record<string, string> = {
  clothing: "Administra tallas y colores para cada variante.",
  kitchen: "Define estaciones y tiempos de preparacion para la cocina.",
  nutrition: "Informacion nutricional y dietetica del plato.",
  trazabilidad: "Control de lotes y fechas de vencimiento.",
  bebida: "Configuracion de presentacion y servicio de la bebida.",
}

export const ProductSchemaFields = memo(function ProductSchemaFields({
  schemaFields,
  groupedSchemaFields,
  verticalInfo,
  verticalName,
  isLegacyProduct,
  extraFieldError,
  renderSchemaField,
  productId,
  migrationAssistantPath,
  productKind,
  onProductKindChange,
}: ProductSchemaFieldsProps) {
  if (!schemaFields.length) return null

  const isRestaurant = productKind !== undefined && productKind !== null

  return (
    <div className="mt-4 space-y-4 rounded-lg border bg-muted/30 p-4 md:col-span-1 lg:col-span-2 lg:col-start-1 lg:row-start-5 lg:pr-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="text-sm font-medium">
            Campos del vertical ({verticalInfo?.config?.displayName ?? 'Vertical'})
          </Label>
          <p className="text-xs text-muted-foreground">
            Ajusta la informacion requerida por el esquema {verticalName}.
          </p>
          {extraFieldError && (
            <p className="mt-1 text-xs text-red-500">{extraFieldError}</p>
          )}
        </div>
        {isLegacyProduct && (
          <Badge variant="destructive" className="self-start">
            Legacy
          </Badge>
        )}
      </div>
      {isLegacyProduct && (
        <div className="rounded-md bg-amber-50/70 p-3 text-xs text-amber-800">
          Este producto aun no se ha migrado al esquema de {verticalName}.{" "}
          <Link
            href={`${migrationAssistantPath}?productId=${productId ?? ""}`}
            className="font-semibold underline"
          >
            Dividir stock / completar datos
          </Link>
        </div>
      )}

      {/* ── Product Kind Selector (restaurant only) ── */}
      {isRestaurant && onProductKindChange && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de producto</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRODUCT_KINDS.map(({ value, label, icon: Icon, description }) => {
              const selected = (productKind || "DISH") === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onProductKindChange(value)}
                  className={cn(
                    "group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all duration-200",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                      selected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className={cn(
                    "text-xs font-medium",
                    selected ? "text-primary" : "text-muted-foreground"
                  )}>
                    {label}
                  </span>
                  <span className="text-[10px] leading-tight text-muted-foreground text-center">
                    {description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {groupedSchemaFields.map(([groupKey, fields]) => (
        <div key={groupKey} className="space-y-3 rounded-md border border-dashed p-3">
          <div>
            <p className="text-sm font-semibold capitalize">
              {groupKey === "general"
                ? "Campos generales"
                : groupKey.replace(/[-_]/g, " ")}
            </p>
            {GROUP_DESCRIPTIONS[groupKey] && (
              <p className="text-xs text-muted-foreground">
                {GROUP_DESCRIPTIONS[groupKey]}
              </p>
            )}
          </div>
          {fields.map((field: any) => (
            <div key={field.key} className="space-y-2">
              <Label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </Label>
              {renderSchemaField(field)}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
})
