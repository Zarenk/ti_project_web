import {
  createTextElement,
  createImageElement,
  createShapeElement,
  type CanvasElement,
} from './ad-editor-types'

export interface AdTemplate {
  name: string
  description: string
  backgroundColor: string
  elements: (productImageUrl?: string, title?: string, price?: string, cta?: string) => CanvasElement[]
}

export const AD_TEMPLATES: AdTemplate[] = [
  {
    name: 'Moderno Oscuro',
    description: 'Fondo oscuro, texto blanco, acento azul',
    backgroundColor: '#0f172a',
    elements: (img, title, price, cta) => [
      ...(img ? [createImageElement(img, { name: 'Producto', x: 290, y: 180, width: 500, height: 500 })] : []),
      createTextElement({ name: 'Título', text: title || 'Título del producto', x: 60, y: 60, width: 960, fontSize: 44, fill: '#FFFFFF', fontStyle: 'bold' }),
      createTextElement({ name: 'Precio', text: price || 'S/ 0.00', x: 60, y: 780, width: 400, fontSize: 56, fill: '#22d3ee', fontStyle: 'bold' }),
      createShapeElement({ name: 'Botón', x: 60, y: 900, width: 280, height: 56, shapeFill: '#3b82f6', cornerRadius: 28 }),
      createTextElement({ name: 'CTA', text: cta || 'Comprar ahora', x: 80, y: 912, width: 240, fontSize: 22, fill: '#FFFFFF', fontStyle: 'bold', align: 'center' }),
    ],
  },
  {
    name: 'Minimalista Blanco',
    description: 'Fondo claro, texto oscuro, limpio',
    backgroundColor: '#fafafa',
    elements: (img, title, price, cta) => [
      ...(img ? [createImageElement(img, { name: 'Producto', x: 190, y: 100, width: 700, height: 700 })] : []),
      createTextElement({ name: 'Título', text: title || 'Título', x: 80, y: 840, width: 920, fontSize: 36, fill: '#1a1a1a', fontStyle: 'bold', align: 'center' }),
      createTextElement({ name: 'Precio', text: price || 'S/ 0.00', x: 80, y: 920, width: 920, fontSize: 48, fill: '#059669', fontStyle: 'bold', align: 'center' }),
      createTextElement({ name: 'CTA', text: cta || 'Ver más', x: 80, y: 1000, width: 920, fontSize: 20, fill: '#6b7280', align: 'center' }),
    ],
  },
  {
    name: 'Vibrante Gradiente',
    description: 'Fondo vibrante, tipografía grande',
    backgroundColor: '#7c3aed',
    elements: (img, title, price, cta) => [
      createShapeElement({ name: 'Overlay', x: 0, y: 0, width: 1080, height: 1080, shapeFill: '#000000', opacity: 0.3 }),
      ...(img ? [createImageElement(img, { name: 'Producto', x: 340, y: 250, width: 400, height: 400 })] : []),
      createTextElement({ name: 'Título', text: title || 'OFERTA', x: 40, y: 40, width: 1000, fontSize: 72, fill: '#FFFFFF', fontStyle: 'bold', align: 'center' }),
      createTextElement({ name: 'Precio', text: price || 'S/ 0.00', x: 40, y: 720, width: 1000, fontSize: 80, fill: '#fbbf24', fontStyle: 'bold', align: 'center' }),
      createShapeElement({ name: 'Botón', x: 290, y: 880, width: 500, height: 70, shapeFill: '#fbbf24', cornerRadius: 35 }),
      createTextElement({ name: 'CTA', text: cta || '¡COMPRAR YA!', x: 310, y: 895, width: 460, fontSize: 28, fill: '#1a1a1a', fontStyle: 'bold', align: 'center' }),
    ],
  },
  {
    name: 'Elegante Negro',
    description: 'Estilo premium, acentos dorados',
    backgroundColor: '#111111',
    elements: (img, title, price, cta) => [
      createShapeElement({ name: 'Línea superior', x: 80, y: 60, width: 920, height: 2, shapeFill: '#d4af37' }),
      ...(img ? [createImageElement(img, { name: 'Producto', x: 240, y: 150, width: 600, height: 600 })] : []),
      createTextElement({ name: 'Título', text: title || 'Exclusivo', x: 80, y: 800, width: 920, fontSize: 40, fill: '#d4af37', fontStyle: 'bold', align: 'center' }),
      createTextElement({ name: 'Precio', text: price || 'S/ 0.00', x: 80, y: 880, width: 920, fontSize: 52, fill: '#FFFFFF', fontStyle: 'bold', align: 'center' }),
      createShapeElement({ name: 'Línea inferior', x: 80, y: 1000, width: 920, height: 2, shapeFill: '#d4af37' }),
      createTextElement({ name: 'CTA', text: cta || 'Descúbrelo', x: 80, y: 1020, width: 920, fontSize: 18, fill: '#888888', align: 'center' }),
    ],
  },
]
