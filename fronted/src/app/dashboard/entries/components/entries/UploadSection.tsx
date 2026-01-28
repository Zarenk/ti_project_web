'use client'

import { useState } from 'react'
import { ChevronDown, Eye, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useRouter } from 'next/navigation'

interface UploadSectionProps {
  register: any
  watch: (name: string) => any
  handlePDFUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  handlePDFGuiaUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onPreviewInvoice: () => void
  onPreviewGuide: () => void
  invoicePreviewUrl: string | null
  guidePreviewUrl: string | null
  currency: string
  onCurrencyChange: (value: 'USD' | 'PEN') => void
  showInvoiceFields: boolean
  showGuideFields: boolean
}

export function UploadSection({
  register,
  watch,
  handlePDFUpload,
  handlePDFGuiaUpload,
  onPreviewInvoice,
  onPreviewGuide,
  invoicePreviewUrl,
  guidePreviewUrl,
  currency,
  onCurrencyChange,
  showInvoiceFields,
  showGuideFields,
}: UploadSectionProps) {
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const renderStatusChip = (filled: boolean, optional = false) => (
    <span
      className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
          : optional
            ? 'border-slate-200/70 bg-slate-50 text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300'
            : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
      }`}
    >
      {filled ? 'Listo' : optional ? 'Opcional' : 'Requerido'}
    </span>
  )

  const hasValue = (name: string) => {
    const value = watch(name)
    return Boolean(value && String(value).trim().length > 0)
  }

  return (
    <div className="w-full flex-1 flex-col border rounded-md p-2">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-sm font-medium">Carga y datos del comprobante</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={`${isCollapsed ? 'Expandir' : 'Contraer'} panel de carga`}
              aria-expanded={!isCollapsed}
              className="cursor-pointer transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isCollapsed ? 'Mostrar panel' : 'Ocultar panel'}</TooltipContent>
        </Tooltip>
      </div>

      {!isCollapsed && (
        <>
          <div className="mb-2 flex flex-wrap justify-start gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="sm:w-auto ml-0 cursor-pointer bg-green-700 text-white text-xs transition-colors hover:bg-green-800"
                  type="button"
                  onClick={() => router.push('/dashboard/entries/excel-upload')}
                >
                  <span className="hidden sm:block">Subir Excel</span>
                  <FileSpreadsheet className="w-2 h-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Carga un Excel para registrar múltiples productos.</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="sm:w-auto ml-0 cursor-pointer bg-blue-700 text-white text-xs transition-colors hover:bg-blue-800"
                    type="button"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                  >
                    <span className="hidden sm:block">Subir Factura PDF</span>
                    <FileText className="w-2 h-2" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Completa datos automáticamente desde la factura.</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 cursor-pointer border-blue-700/60 text-blue-700 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    onClick={onPreviewInvoice}
                    disabled={!invoicePreviewUrl}
                    aria-label="Ver factura PDF"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {invoicePreviewUrl ? 'Ver factura y mostrar sus campos.' : 'Sube una factura para previsualizarla.'}
                </TooltipContent>
              </Tooltip>
            </div>

            <input
              type="file"
              id="pdf-upload"
              accept="application/pdf"
              className="hidden"
              onChange={handlePDFUpload}
            />

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="sm:w-auto ml-0 cursor-pointer bg-yellow-700 text-white text-xs transition-colors hover:bg-yellow-800"
                    type="button"
                    onClick={() => document.getElementById('pdf-guia-upload')?.click()}
                  >
                    <span className="hidden sm:block">Subir Guia PDF</span>
                    <FileText className="w-2 h-2" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Procesa la guía de remisión y sus campos.</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 cursor-pointer border-yellow-700/60 text-yellow-700 transition-colors hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                    onClick={onPreviewGuide}
                    disabled={!guidePreviewUrl}
                    aria-label="Ver guia PDF"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {guidePreviewUrl ? 'Ver guía y mostrar sus campos.' : 'Sube una guía para previsualizarla.'}
                </TooltipContent>
              </Tooltip>
            </div>

            <input
              type="file"
              id="pdf-guia-upload"
              accept="application/pdf"
              className="hidden"
              onChange={handlePDFGuiaUpload}
            />
          </div>

          {showInvoiceFields && (
            <>
              <Label className="text-sm font-medium mb-2">
                Fecha de Emision
                {renderStatusChip(hasValue('fecha_emision_comprobante'))}
              </Label>
              <Input
                {...register('fecha_emision_comprobante')}
                readOnly
                className="mt-1"
              />

              <div className="flex flex-wrap justify-start gap-2">
                <div className="flex flex-col flex-1 min-w-[160px]">
                  <Label className="text-sm font-medium py-2">
                    Comprobante
                    {renderStatusChip(hasValue('comprobante'))}
                  </Label>
                  <Input {...register('comprobante')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col flex-1 min-w-[160px]">
                  <Label className="text-sm font-medium py-2">
                    Serie
                    {renderStatusChip(hasValue('serie'))}
                  </Label>
                  <Input {...register('serie')} readOnly className="mt-1" />
                </div>
              </div>

              <div className="flex flex-wrap justify-start gap-2">
                <div className="flex flex-col flex-1 min-w-[160px]">
                  <Label className="text-sm font-medium py-2">
                    Total
                    {renderStatusChip(hasValue('total_comprobante'))}
                  </Label>
                  <Input {...register('total_comprobante')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col flex-1 min-w-[160px]">
                  <Label className="text-sm font-medium py-2">
                    Moneda
                    {renderStatusChip(Boolean(currency), true)}
                  </Label>
                  <Select value={currency} onValueChange={(value) => onCurrencyChange(value as 'USD' | 'PEN')}>
                    <SelectTrigger className="mt-1 cursor-pointer transition-colors hover:border-border hover:bg-accent hover:text-foreground">
                      <SelectValue placeholder="Selecciona una moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEN">Soles (PEN)</SelectItem>
                      <SelectItem value="USD">Dolares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {showGuideFields && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col">
                  <Label className="text-sm font-medium">
                    Guia - Serie
                    {renderStatusChip(hasValue('guia_serie'), true)}
                  </Label>
                  <Input {...register('guia_serie')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium">
                    Guia - Correlativo
                    {renderStatusChip(hasValue('guia_correlativo'), true)}
                  </Label>
                  <Input {...register('guia_correlativo')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium">
                    Fecha de emision (guia)
                    {renderStatusChip(hasValue('guia_fecha_emision'), true)}
                  </Label>
                  <Input {...register('guia_fecha_emision')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium">
                    Fecha entrega transportista
                    {renderStatusChip(hasValue('guia_fecha_entrega_transportista'), true)}
                  </Label>
                  <Input {...register('guia_fecha_entrega_transportista')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col md:col-span-2 lg:col-span-2">
                  <Label className="text-sm font-medium">
                    Motivo de traslado
                    {renderStatusChip(hasValue('guia_motivo_traslado'), true)}
                  </Label>
                  <Input {...register('guia_motivo_traslado')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col md:col-span-2 lg:col-span-2">
                  <Label className="text-sm font-medium">
                    Punto de partida
                    {renderStatusChip(hasValue('guia_punto_partida'), true)}
                  </Label>
                  <Input {...register('guia_punto_partida')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col md:col-span-2 lg:col-span-2">
                  <Label className="text-sm font-medium">
                    Punto de llegada
                    {renderStatusChip(hasValue('guia_punto_llegada'), true)}
                  </Label>
                  <Input {...register('guia_punto_llegada')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col md:col-span-2 lg:col-span-3">
                  <Label className="text-sm font-medium">
                    Destinatario
                    {renderStatusChip(hasValue('guia_destinatario'), true)}
                  </Label>
                  <Input {...register('guia_destinatario')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium">
                    Unidad peso bruto
                    {renderStatusChip(hasValue('guia_peso_bruto_unidad'), true)}
                  </Label>
                  <Input {...register('guia_peso_bruto_unidad')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col">
                  <Label className="text-sm font-medium">
                    Peso bruto total
                    {renderStatusChip(hasValue('guia_peso_bruto_total'), true)}
                  </Label>
                  <Input {...register('guia_peso_bruto_total')} readOnly className="mt-1" />
                </div>
                <div className="flex flex-col md:col-span-2 lg:col-span-3">
                  <Label className="text-sm font-medium">
                    Transportista
                    {renderStatusChip(hasValue('guia_transportista'), true)}
                  </Label>
                  <Input {...register('guia_transportista')} readOnly className="mt-1" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
