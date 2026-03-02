'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import {
  Download,
  LayoutTemplate,
  Loader2,
  Sparkles,
  Square,
  Type,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayersPanel } from './layers-panel'
import { PropertiesPanel } from './properties-panel'
import { AD_TEMPLATES } from './ad-templates'
import {
  ASPECT_RATIOS,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_WIDTH,
  createImageElement,
  createShapeElement,
  createTextElement,
  type CanvasElement,
} from './ad-editor-types'
import type Konva from 'konva'

// Single dynamic import for the entire canvas (react-konva must not be split across Lazy boundaries)
const AdCanvas = dynamic(() => import('./ad-canvas'), { ssr: false })

interface AdEditorProps {
  initialElements?: CanvasElement[]
  productImageUrl?: string
  adTitle?: string
  adPrice?: string
  adCta?: string
  onClose: () => void
  onSave?: (state: { elements: CanvasElement[]; canvasWidth: number; canvasHeight: number; exportedDataUrl: string }) => void
  onRegenerate?: () => Promise<{ title?: string; price?: string; cta?: string; imageUrl?: string } | null>
}

export function AdEditor({
  initialElements,
  productImageUrl,
  adTitle,
  adPrice,
  adCta,
  onClose,
  onSave,
  onRegenerate,
}: AdEditorProps) {
  const stageRef = useRef<Konva.Stage>(null)

  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS_WIDTH)
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS_HEIGHT)
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e')
  const [zoom, setZoom] = useState(0.45)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Build initial elements from ad data or use provided
  const [elements, setElements] = useState<CanvasElement[]>(() => {
    if (initialElements?.length) return initialElements
    const els: CanvasElement[] = []
    if (productImageUrl) {
      els.push(createImageElement(productImageUrl, {
        name: 'Producto',
        x: 290,
        y: 200,
        width: 500,
        height: 500,
      }))
    }
    if (adTitle) {
      els.push(createTextElement({
        name: 'Título',
        text: adTitle,
        x: 80,
        y: 80,
        width: 920,
        fontSize: 48,
        fontFamily: 'Inter',
        fill: '#FFFFFF',
        fontStyle: 'bold',
      }))
    }
    if (adPrice) {
      els.push(createTextElement({
        name: 'Precio',
        text: adPrice,
        x: 80,
        y: 800,
        width: 400,
        fontSize: 64,
        fontFamily: 'Inter',
        fill: '#10B981',
        fontStyle: 'bold',
      }))
    }
    if (adCta) {
      els.push(createShapeElement({
        name: 'Botón CTA',
        x: 80,
        y: 920,
        width: 300,
        height: 60,
        shapeFill: '#3B82F6',
        cornerRadius: 12,
      }))
      els.push(createTextElement({
        name: 'CTA',
        text: adCta,
        x: 110,
        y: 932,
        width: 240,
        fontSize: 24,
        fontFamily: 'Inter',
        fill: '#FFFFFF',
        fontStyle: 'bold',
        align: 'center',
      }))
    }
    return els
  })

  const selectedElement = useMemo(
    () => elements.find((el) => el.id === selectedId) || null,
    [elements, selectedId],
  )

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    )
  }, [])

  const addElement = useCallback((el: CanvasElement) => {
    setElements((prev) => [...prev, el])
    setSelectedId(el.id)
  }, [])

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id))
    if (selectedId === id) setSelectedId(null)
  }, [selectedId])

  const reorderElements = useCallback((fromIndex: number, toIndex: number) => {
    setElements((prev) => {
      const next = [...prev]
      const [removed] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, removed)
      return next
    })
  }, [])

  const handleAspectRatio = useCallback((w: number, h: number) => {
    setCanvasWidth(w)
    setCanvasHeight(h)
  }, [])

  const handleExport = useCallback(() => {
    if (!stageRef.current) return
    // Deselect to hide transformer handles
    setSelectedId(null)
    setTimeout(() => {
      const dataUrl = stageRef.current!.toDataURL({ pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `ad-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      toast.success('Imagen exportada')
    }, 100)
  }, [])

  const handleSave = useCallback(() => {
    if (!stageRef.current || !onSave) return
    setSelectedId(null)
    setTimeout(() => {
      const exportedDataUrl = stageRef.current!.toDataURL({ pixelRatio: 2 })
      onSave({ elements, canvasWidth, canvasHeight, exportedDataUrl })
      toast.success('Diseño guardado')
    }, 100)
  }, [elements, canvasWidth, canvasHeight, onSave])

  const applyTemplate = useCallback((templateIndex: number) => {
    const template = AD_TEMPLATES[templateIndex]
    if (!template) return
    setBackgroundColor(template.backgroundColor)
    setElements(template.elements(productImageUrl, adTitle, adPrice, adCta))
    setSelectedId(null)
    toast.success(`Plantilla "${template.name}" aplicada`)
  }, [productImageUrl, adTitle, adPrice, adCta])

  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate) return
    setIsRegenerating(true)
    try {
      const newData = await onRegenerate()
      if (!newData) return
      // Update text elements with new AI-generated content
      setElements((prev) =>
        prev.map((el) => {
          if (el.type !== 'text') return el
          if (el.name === 'Título' && newData.title) return { ...el, text: newData.title }
          if (el.name === 'Precio' && newData.price) return { ...el, text: newData.price }
          if (el.name === 'CTA' && newData.cta) return { ...el, text: newData.cta }
          return el
        }),
      )
      toast.success('Contenido regenerado con IA')
    } catch (err: any) {
      toast.error(err.message || 'Error al regenerar')
    } finally {
      setIsRegenerating(false)
    }
  }, [onRegenerate])

  // Calculate stage display size
  const containerWidth = canvasWidth * zoom
  const containerHeight = canvasHeight * zoom

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 flex h-[85vh] flex-col rounded-lg border bg-background shadow-xl">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Editor de Publicidad</h3>
          {/* Aspect ratio buttons */}
          <div className="flex gap-0.5 rounded-md border p-0.5">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.label}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  canvasWidth === ar.width && canvasHeight === ar.height
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleAspectRatio(ar.width, ar.height)}
              >
                {ar.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-md border px-1.5 py-0.5">
            <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.05))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-10 text-center text-[10px] font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom((z) => Math.min(1.5, z + 0.05))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add elements */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => addElement(createTextElement())}
          >
            <Type className="h-3.5 w-3.5" /> Texto
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => addElement(createShapeElement())}
          >
            <Square className="h-3.5 w-3.5" /> Forma
          </Button>

          {/* Templates */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <LayoutTemplate className="h-3.5 w-3.5" /> Plantillas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {AD_TEMPLATES.map((t, i) => (
                <DropdownMenuItem key={t.name} onClick={() => applyTemplate(i)}>
                  <div
                    className="mr-2 h-3 w-3 rounded-sm border"
                    style={{ backgroundColor: t.backgroundColor }}
                  />
                  <div>
                    <div className="text-xs font-medium">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground">{t.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Regenerate with AI */}
          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={isRegenerating}
              onClick={handleRegenerate}
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {isRegenerating ? 'Regenerando...' : 'Regenerar IA'}
            </Button>
          )}

          {/* Actions */}
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> PNG
          </Button>
          {onSave && (
            <Button size="sm" className="h-7 gap-1 text-xs" onClick={handleSave}>
              Guardar
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main layout: Layers | Canvas | Properties */}
      <div className="flex flex-1 overflow-hidden">
        {/* Layers panel */}
        <div className="w-48 shrink-0 overflow-y-auto border-r bg-muted/30">
          <div className="border-b px-3 py-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Capas
            </h4>
          </div>
          <LayersPanel
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleVisible={(id) => {
              const el = elements.find((e) => e.id === id)
              if (el) updateElement(id, { visible: !el.visible })
            }}
            onToggleLock={(id) => {
              const el = elements.find((e) => e.id === id)
              if (el) updateElement(id, { locked: !el.locked })
            }}
            onReorder={reorderElements}
            onRemove={removeElement}
          />
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto bg-neutral-900/50 p-4">
          <div
            className="mx-auto"
            style={{ width: containerWidth, height: containerHeight }}
          >
            <AdCanvas
              ref={stageRef}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              zoom={zoom}
              backgroundColor={backgroundColor}
              elements={elements}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={updateElement}
            />
          </div>
        </div>

        {/* Properties panel */}
        <div className="w-56 shrink-0 overflow-y-auto border-l bg-muted/30">
          <div className="border-b px-3 py-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {selectedElement ? selectedElement.name : 'Propiedades'}
            </h4>
          </div>
          {!selectedElement ? (
            <div className="space-y-3 p-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fondo</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    className="h-7 w-7 cursor-pointer rounded border"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                  />
                  <input
                    className="h-7 flex-1 rounded-md border bg-background px-2 text-xs"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <PropertiesPanel element={selectedElement} onChange={updateElement} />
          )}
        </div>
      </div>
    </div>
  )
}
