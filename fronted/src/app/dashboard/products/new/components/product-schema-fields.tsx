"use client"

import { memo } from 'react'
import Link from 'next/link'

import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

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
}: ProductSchemaFieldsProps) {
  if (!schemaFields.length) return null

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
      {groupedSchemaFields.map(([groupKey, fields]) => (
        <div key={groupKey} className="space-y-3 rounded-md border border-dashed p-3">
          <div>
            <p className="text-sm font-semibold capitalize">
              {groupKey === "general"
                ? "Campos generales"
                : groupKey.replace(/[-_]/g, " ")}
            </p>
            {groupKey === "clothing" && (
              <p className="text-xs text-muted-foreground">
                Administra tallas y colores para cada variante.
              </p>
            )}
            {groupKey === "kitchen" && (
              <p className="text-xs text-muted-foreground">
                Define estaciones y tiempos de preparacion para la cocina.
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
