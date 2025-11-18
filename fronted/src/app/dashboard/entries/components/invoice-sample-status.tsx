'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  assignInvoiceTemplate,
  getInvoiceSamples,
  getInvoiceTemplates,
  InvoiceSample,
  InvoiceTemplateSummary,
} from '../entries.api'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  PENDING_TEMPLATE: 'Esperando plantilla',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
}

const STATUS_VARIANT: Record<
  string,
  'secondary' | 'default' | 'destructive'
> = {
  PENDING: 'secondary',
  PROCESSING: 'secondary',
  PENDING_TEMPLATE: 'secondary',
  COMPLETED: 'default',
  FAILED: 'destructive',
}

interface Props {
  entryId: number
}

export function InvoiceSampleStatus({ entryId }: Props) {
  const [samples, setSamples] = useState<InvoiceSample[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    getInvoiceSamples(entryId, true)
      .then((data) => {
        if (!active) return
        setSamples(data)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo obtener el estado del PDF',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [entryId, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Cargando...
      </div>
    )
  }

  if (error) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Error
      </Badge>
    )
  }

  if (!samples || samples.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin PDF</span>
  }

  const latest = samples[0]
  const showManualAssignment =
    latest.extractionStatus === 'PENDING_TEMPLATE' ||
    latest.extractionStatus === 'FAILED'
  const hasExtractionDetails = Boolean(latest.extractionResult)
  const statusLabel =
    STATUS_LABELS[latest.extractionStatus] ?? latest.extractionStatus
  const badgeVariant =
    STATUS_VARIANT[latest.extractionStatus] ?? 'secondary'
  const lastLog = latest.logs?.[0]

  return (
    <div className="flex flex-col gap-1 text-xs">
      <Badge variant={badgeVariant} className="w-fit text-[10px]">
        {statusLabel}
      </Badge>
      {lastLog ? (
        <span className="text-muted-foreground">{lastLog.message}</span>
      ) : null}
      {hasExtractionDetails ? (
        <ExtractionDetails sample={latest} />
      ) : null}
      {showManualAssignment ? (
        <ManualTemplateAssign
          sampleId={latest.id}
          currentTemplateId={latest.invoiceTemplateId ?? undefined}
          onAssigned={() => setRefreshKey((key) => key + 1)}
        />
      ) : null}
    </div>
  )
}

function ManualTemplateAssign({
  sampleId,
  currentTemplateId,
  onAssigned,
}: {
  sampleId: number
  currentTemplateId?: number
  onAssigned: () => void
}) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<InvoiceTemplateSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string>(
    currentTemplateId ? String(currentTemplateId) : '',
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || templates.length > 0) return
    setLoading(true)
    setError(null)
    getInvoiceTemplates()
      .then(setTemplates)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la lista de plantillas',
        ),
      )
      .finally(() => setLoading(false))
  }, [open, templates.length])

  const handleAssign = async () => {
    if (!selected) {
      toast.error('Selecciona una plantilla antes de continuar.')
      return
    }
    setIsSaving(true)
    try {
      await assignInvoiceTemplate(sampleId, Number(selected))
      toast.success('Plantilla asignada correctamente.')
      setOpen(false)
      onAssigned()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo asignar la plantilla.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const options = useMemo(
    () =>
      templates.map((template) => ({
        value: String(template.id),
        label: `${template.documentType} • ${template.providerName ?? 'Sin proveedor'} • v${template.version}`,
      })),
    [templates],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-[10px]">
          Seleccionar plantilla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar plantilla</DialogTitle>
          <DialogDescription>
            Usa esta opción cuando el sistema no pudo detectar la plantilla
            automáticamente.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando plantillas...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una plantilla" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <Button
            onClick={handleAssign}
            disabled={isSaving || loading || !templates.length}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Asignar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExtractionDetails({ sample }: { sample: InvoiceSample }) {
  const [open, setOpen] = useState(false)
  const fields = sample.extractionResult?.fields ?? {}
  const entries = Object.entries(fields)
  const preview = sample.extractionResult?.textPreview
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-0 text-[10px]">
          Ver detalles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campos extraídos</DialogTitle>
          <DialogDescription>
            Revisa los valores detectados por la plantilla{' '}
            {sample.extractionResult?.templateId
              ? `#${sample.extractionResult?.templateId}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        {entries.length > 0 ? (
          <div className="space-y-2 text-sm">
            {entries.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 border-b pb-1"
              >
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium">
                  {value ?? <em className="text-muted-foreground">sin valor</em>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No se encontraron campos mapeados para esta plantilla.
          </p>
        )}
        {preview ? (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-1">
              Fragmento del texto
            </p>
            <pre className="rounded bg-muted p-2 text-xs whitespace-pre-wrap">
              {preview}
            </pre>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
