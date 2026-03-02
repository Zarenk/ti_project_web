export interface CanvasElement {
  id: string
  type: 'text' | 'image' | 'shape'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  name: string
  // Text-specific
  text?: string
  fontSize?: number
  fontFamily?: string
  fill?: string
  fontStyle?: string
  align?: 'left' | 'center' | 'right'
  // Image-specific
  src?: string
  // Shape-specific
  shapeType?: 'rect' | 'circle' | 'rounded-rect'
  shapeFill?: string
  cornerRadius?: number
  stroke?: string
  strokeWidth?: number
}

export interface AspectRatio {
  label: string
  width: number
  height: number
}

export const ASPECT_RATIOS: AspectRatio[] = [
  { label: '1:1', width: 1080, height: 1080 },
  { label: '4:5', width: 1080, height: 1350 },
  { label: '9:16', width: 1080, height: 1920 },
  { label: '16:9', width: 1920, height: 1080 },
]

export const DEFAULT_CANVAS_WIDTH = 1080
export const DEFAULT_CANVAS_HEIGHT = 1080

export interface EditorState {
  elements: CanvasElement[]
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
}

export function createTextElement(overrides: Partial<CanvasElement> = {}): CanvasElement {
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'text',
    x: 100,
    y: 100,
    width: 400,
    height: 60,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    name: 'Texto',
    text: 'Nuevo texto',
    fontSize: 32,
    fontFamily: 'Inter',
    fill: '#FFFFFF',
    fontStyle: 'normal',
    align: 'left',
    ...overrides,
  }
}

export function createImageElement(src: string, overrides: Partial<CanvasElement> = {}): CanvasElement {
  return {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'image',
    x: 50,
    y: 50,
    width: 400,
    height: 400,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    name: 'Imagen',
    src,
    ...overrides,
  }
}

export function createShapeElement(overrides: Partial<CanvasElement> = {}): CanvasElement {
  return {
    id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'shape',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    name: 'Forma',
    shapeType: 'rect',
    shapeFill: '#3B82F6',
    cornerRadius: 0,
    stroke: '',
    strokeWidth: 0,
    ...overrides,
  }
}
