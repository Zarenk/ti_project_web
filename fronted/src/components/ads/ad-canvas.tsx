'use client'

import { forwardRef } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import { TextNode, ImageNode, ShapeNode } from './canvas-elements'
import type Konva from 'konva'
import type { CanvasElement } from './ad-editor-types'

interface AdCanvasProps {
  canvasWidth: number
  canvasHeight: number
  zoom: number
  backgroundColor: string
  elements: CanvasElement[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (id: string, updates: Partial<CanvasElement>) => void
}

const AdCanvas = forwardRef<Konva.Stage, AdCanvasProps>(function AdCanvas(
  { canvasWidth, canvasHeight, zoom, backgroundColor, elements, selectedId, onSelect, onChange },
  ref,
) {
  const containerWidth = canvasWidth * zoom
  const containerHeight = canvasHeight * zoom

  const handleStageClick = (e: any) => {
    if (e.target === e.target.getStage() || e.target.attrs?.id === 'canvas-bg') {
      onSelect(null)
    }
  }

  return (
    <Stage
      ref={ref}
      width={canvasWidth}
      height={canvasHeight}
      scaleX={zoom}
      scaleY={zoom}
      onClick={handleStageClick}
      onTap={handleStageClick}
      style={{
        width: containerWidth,
        height: containerHeight,
        borderRadius: 8,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      <Layer>
        <Rect
          id="canvas-bg"
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          fill={backgroundColor}
          listening={true}
        />
        {elements.map((el) => {
          const props = {
            element: el,
            isSelected: selectedId === el.id,
            onSelect: () => onSelect(el.id),
            onChange: (updates: Partial<CanvasElement>) => onChange(el.id, updates),
          }
          if (el.type === 'text') return <TextNode key={el.id} {...props} />
          if (el.type === 'image') return <ImageNode key={el.id} {...props} />
          if (el.type === 'shape') return <ShapeNode key={el.id} {...props} />
          return null
        })}
      </Layer>
    </Stage>
  )
})

export default AdCanvas
