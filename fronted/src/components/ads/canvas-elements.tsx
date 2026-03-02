'use client'

import { useEffect, useRef, useState } from 'react'
import { Text, Image as KonvaImage, Rect, Circle, Group, Transformer } from 'react-konva'
import type Konva from 'konva'
import type { CanvasElement } from './ad-editor-types'

// ── Draggable Text Element ──────────────────────────────────────────────────

interface TextNodeProps {
  element: CanvasElement
  isSelected: boolean
  onSelect: () => void
  onChange: (updates: Partial<CanvasElement>) => void
}

export function TextNode({ element, isSelected, onSelect, onChange }: TextNodeProps) {
  const textRef = useRef<Konva.Text>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  return (
    <>
      <Text
        ref={textRef}
        text={element.text}
        x={element.x}
        y={element.y}
        width={element.width}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fill={element.fill}
        fontStyle={element.fontStyle}
        align={element.align}
        rotation={element.rotation}
        opacity={element.opacity}
        visible={element.visible}
        draggable={!element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() })
        }}
        onTransformEnd={() => {
          const node = textRef.current
          if (!node) return
          const scaleX = node.scaleX()
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            fontSize: Math.max(8, (element.fontSize || 32) * scaleX),
            rotation: node.rotation(),
          })
          node.scaleX(1)
          node.scaleY(1)
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={['middle-left', 'middle-right', 'top-left', 'top-right', 'bottom-left', 'bottom-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 10) return oldBox
            return newBox
          }}
        />
      )}
    </>
  )
}

// ── Draggable Image Element ─────────────────────────────────────────────────

interface ImageNodeProps {
  element: CanvasElement
  isSelected: boolean
  onSelect: () => void
  onChange: (updates: Partial<CanvasElement>) => void
}

export function ImageNode({ element, isSelected, onSelect, onChange }: ImageNodeProps) {
  const imageRef = useRef<Konva.Image>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!element.src) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = element.src
    img.onload = () => setImage(img)
  }, [element.src])

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  if (!image) return null

  return (
    <>
      <KonvaImage
        ref={imageRef}
        image={image}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        opacity={element.opacity}
        visible={element.visible}
        draggable={!element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() })
        }}
        onTransformEnd={() => {
          const node = imageRef.current
          if (!node) return
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * node.scaleX()),
            height: Math.max(20, node.height() * node.scaleY()),
            rotation: node.rotation(),
          })
          node.scaleX(1)
          node.scaleY(1)
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          keepRatio
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox
            return newBox
          }}
        />
      )}
    </>
  )
}

// ── Draggable Shape Element ─────────────────────────────────────────────────

interface ShapeNodeProps {
  element: CanvasElement
  isSelected: boolean
  onSelect: () => void
  onChange: (updates: Partial<CanvasElement>) => void
}

export function ShapeNode({ element, isSelected, onSelect, onChange }: ShapeNodeProps) {
  const shapeRef = useRef<Konva.Rect>(null)
  const trRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [isSelected])

  return (
    <>
      <Rect
        ref={shapeRef}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={element.shapeFill}
        cornerRadius={element.cornerRadius}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        rotation={element.rotation}
        opacity={element.opacity}
        visible={element.visible}
        draggable={!element.locked}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({ x: e.target.x(), y: e.target.y() })
        }}
        onTransformEnd={() => {
          const node = shapeRef.current
          if (!node) return
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(10, node.width() * node.scaleX()),
            height: Math.max(10, node.height() * node.scaleY()),
            rotation: node.rotation(),
          })
          node.scaleX(1)
          node.scaleY(1)
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox
            return newBox
          }}
        />
      )}
    </>
  )
}
